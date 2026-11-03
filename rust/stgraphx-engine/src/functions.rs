// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

use crate::value::Value;
use crate::random::RandomGenerator;

pub(crate) fn is_supported(name: &str) -> bool {
    matches!(
        name,
        "array"
            | "append"
            | "abs"
            | "ceil"
            | "cos"
            | "exp"
            | "floor"
            | "log"
            | "log10"
            | "log2"
            | "sign"
            | "sin"
            | "sqrt"
            | "tan"
            | "trunc"
            | "int"
            | "pow"
            | "range"
            | "rand"
            | "randInt"
            | "min"
            | "max"
            | "sum"
            | "average"
            | "count"
            | "size"
    )
}

pub(crate) fn evaluate(
    name: &str,
    arguments: &[Value],
    random: Option<&RandomGenerator>,
) -> Result<Value, String> {
    match name {
        "array" => Err("array requires an expression body".to_string()),
        "append" => append(arguments),
        "abs" => unary(name, arguments, f64::abs),
        "ceil" => unary(name, arguments, f64::ceil),
        "cos" => unary(name, arguments, f64::cos),
        "exp" => unary(name, arguments, f64::exp),
        "floor" => unary(name, arguments, f64::floor),
        "log" => unary(name, arguments, f64::ln),
        "log10" => unary(name, arguments, f64::log10),
        "log2" => unary(name, arguments, f64::log2),
        "sign" => unary(name, arguments, f64::signum),
        "sin" => unary(name, arguments, f64::sin),
        "sqrt" => unary(name, arguments, f64::sqrt),
        "tan" => unary(name, arguments, f64::tan),
        "trunc" | "int" => unary(name, arguments, f64::trunc),
        "pow" => binary(name, arguments, f64::powf),
        "range" => numeric_range(arguments),
        "rand" => random_float(arguments, random),
        "randInt" => random_integer(arguments, random),
        "min" => variadic(name, arguments, f64::min),
        "max" => variadic(name, arguments, f64::max),
        "sum" => reduce_sum(arguments),
        "average" => reduce_average(arguments),
        "count" => reduce_count(arguments),
        "size" => size(arguments),
        _ => Err(format!("unsupported function '{name}'")),
    }
}

fn random_generator(random: Option<&RandomGenerator>) -> Result<&RandomGenerator, String> {
    random.ok_or_else(|| "random functions require execution.randomSeed".to_string())
}

fn random_bounds(arguments: &[Value], name: &str) -> Result<(f64, f64), String> {
    if arguments.len() > 2 {
        return Err(format!("{name} expects 0, 1, or 2 arguments"));
    }
    let scalar = |value: &Value| {
        value
            .as_scalar()
            .filter(|number| number.is_finite())
            .ok_or_else(|| format!("{name} expects finite numeric bounds"))
    };
    match arguments {
        [] => Ok((0.0, 1.0)),
        [maximum] => Ok((0.0, scalar(maximum)?)),
        [minimum, maximum] => Ok((scalar(minimum)?, scalar(maximum)?)),
        _ => unreachable!("random arity was validated"),
    }
}

fn random_float(
    arguments: &[Value],
    random: Option<&RandomGenerator>,
) -> Result<Value, String> {
    let (minimum, maximum) = random_bounds(arguments, "rand")?;
    let sample = random_generator(random)?.next()?;
    Ok(Value::scalar(minimum + sample * (maximum - minimum)))
}

fn random_integer(
    arguments: &[Value],
    random: Option<&RandomGenerator>,
) -> Result<Value, String> {
    if !(1..=2).contains(&arguments.len()) {
        return Err("randInt expects 1 or 2 arguments".to_string());
    }
    let (minimum, maximum) = random_bounds(arguments, "randInt")?;
    let minimum = minimum.ceil();
    let maximum = maximum.floor();
    if maximum < minimum {
        return Err("randInt expects min <= max".to_string());
    }
    let sample = random_generator(random)?.next()?;
    Ok(Value::scalar(
        (sample * (maximum - minimum + 1.0)).floor() + minimum,
    ))
}

const MAX_RANGE_ITEMS: usize = 100_000;

fn numeric_range(arguments: &[Value]) -> Result<Value, String> {
    if !(1..=3).contains(&arguments.len()) {
        return Err("range expects 1, 2, or 3 arguments".to_string());
    }

    let scalar = |index: usize, message: &str| {
        arguments[index]
            .as_scalar()
            .filter(|value| value.is_finite())
            .ok_or_else(|| message.to_string())
    };
    let (start, end, step) = match arguments.len() {
        1 => (0.0, scalar(0, "range bounds must be finite numbers")?, 1.0),
        2 => {
            let start = scalar(0, "range bounds must be finite numbers")?;
            let end = scalar(1, "range bounds must be finite numbers")?;
            let step = if end >= start { 1.0 } else { -1.0 };
            (start, end, step)
        }
        3 => (
            scalar(0, "range bounds must be finite numbers")?,
            scalar(1, "range bounds must be finite numbers")?,
            scalar(2, "range step must be a non-zero finite number")?,
        ),
        _ => unreachable!("range arity was validated"),
    };

    if step == 0.0 {
        return Err("range step must be a non-zero finite number".to_string());
    }
    if (end > start && step < 0.0) || (end < start && step > 0.0) {
        return Err("range step does not reach the end value".to_string());
    }

    let epsilon = step.abs() * 1e-9;
    let mut elements = Vec::new();
    let mut value = start;
    let should_continue = |value: f64| {
        if step > 0.0 {
            value < end - epsilon
        } else {
            value > end + epsilon
        }
    };
    while should_continue(value) {
        elements.push(round_range_value(value));
        if elements.len() > MAX_RANGE_ITEMS {
            return Err("range is too large".to_string());
        }
        value += step;
    }
    Value::tensor(vec![elements.len()], elements)
}

fn round_range_value(value: f64) -> f64 {
    let scaled = value * 1e12;
    if scaled.is_finite() {
        scaled.round() / 1e12
    } else {
        value
    }
}

fn append(arguments: &[Value]) -> Result<Value, String> {
    if arguments.len() < 2 {
        return Err("append expects at least 2 arguments".to_string());
    }

    let has_matrix_before_last = arguments[..arguments.len() - 1].iter().any(is_matrix);
    let mut axis = 0usize;
    let mut values = arguments;
    if has_matrix_before_last && arguments.len() >= 3 {
        if let Some(possible_axis) = arguments.last().and_then(Value::as_scalar) {
            if possible_axis.is_finite() {
                if possible_axis.fract() != 0.0 || !(0.0..=1.0).contains(&possible_axis) {
                    return Err("append matrix axis must be 0 or 1".to_string());
                }
                axis = possible_axis as usize;
                values = &arguments[..arguments.len() - 1];
            }
        }
    }

    if let Some(matrix_index) = values.iter().position(is_matrix) {
        let mut result = values[matrix_index].clone();
        for value in values[..matrix_index].iter().rev() {
            result = append_matrix_vector(&result, value, axis, true)?;
        }
        for value in &values[matrix_index + 1..] {
            result = append_matrix_vector(&result, value, axis, false)?;
        }
        return Ok(result);
    }

    values[1..]
        .iter()
        .try_fold(values[0].clone(), append_flat_values)
}

fn is_matrix(value: &Value) -> bool {
    value.as_tensor().is_some_and(|tensor| tensor.rank() == 2)
}

fn append_flat_values(target: Value, value: &Value) -> Result<Value, String> {
    match (&target, value) {
        (Value::Scalar(first), Value::Tensor(vector)) if vector.rank() == 1 => {
            let mut elements = Vec::with_capacity(vector.elements().len() + 1);
            elements.push(*first);
            elements.extend_from_slice(vector.elements());
            Value::tensor(vec![elements.len()], elements)
        }
        (Value::Tensor(vector), Value::Scalar(last)) if vector.rank() == 1 => {
            let mut elements = vector.elements().to_vec();
            elements.push(*last);
            Value::tensor(vec![elements.len()], elements)
        }
        (Value::Tensor(left), Value::Tensor(right)) if left.rank() == 1 && right.rank() == 1 => {
            let mut elements = Vec::with_capacity(left.elements().len() + right.elements().len());
            elements.extend_from_slice(left.elements());
            elements.extend_from_slice(right.elements());
            Value::tensor(vec![elements.len()], elements)
        }
        _ => Err(
            "append expects a vector or matrix as first argument, or a scalar followed by a vector"
                .to_string(),
        ),
    }
}

fn append_matrix_vector(
    matrix: &Value,
    vector: &Value,
    axis: usize,
    prepend: bool,
) -> Result<Value, String> {
    let matrix = matrix
        .as_tensor()
        .filter(|value| value.rank() == 2)
        .expect("append matrix selection must produce a matrix");
    let vector = vector
        .as_tensor()
        .filter(|value| value.rank() == 1)
        .ok_or_else(|| {
            if axis == 1 {
                "append on matrices axis 1 expects a vector column".to_string()
            } else {
                "append on matrices expects a vector row as second argument".to_string()
            }
        })?;
    let rows = matrix.shape()[0];
    let columns = matrix.shape()[1];

    match axis {
        0 if vector.elements().len() == columns => {
            let output_rows = rows
                .checked_add(1)
                .ok_or_else(|| "append result is too large".to_string())?;
            let mut elements = Vec::with_capacity(matrix.elements().len() + columns);
            if prepend {
                elements.extend_from_slice(vector.elements());
                elements.extend_from_slice(matrix.elements());
            } else {
                elements.extend_from_slice(matrix.elements());
                elements.extend_from_slice(vector.elements());
            }
            Value::tensor(vec![output_rows, columns], elements)
        }
        0 => Err("appended row length does not match matrix column count".to_string()),
        1 if vector.elements().len() == rows => {
            let output_columns = columns
                .checked_add(1)
                .ok_or_else(|| "append result is too large".to_string())?;
            let mut elements = Vec::with_capacity(matrix.elements().len() + rows);
            for (row_index, column_value) in vector.elements().iter().copied().enumerate() {
                let start = row_index * columns;
                let row = &matrix.elements()[start..start + columns];
                if prepend {
                    elements.push(column_value);
                }
                elements.extend_from_slice(row);
                if !prepend {
                    elements.push(column_value);
                }
            }
            Value::tensor(vec![rows, output_columns], elements)
        }
        1 => Err("appended column length does not match matrix row count".to_string()),
        _ => Err("append matrix axis must be 0 or 1".to_string()),
    }
}

fn unary(name: &str, arguments: &[Value], operation: impl Fn(f64) -> f64) -> Result<Value, String> {
    if arguments.len() != 1 {
        return Err(format!("{name} expects exactly 1 argument"));
    }
    Ok(arguments[0].unary(operation))
}

fn binary(
    name: &str,
    arguments: &[Value],
    operation: impl Fn(f64, f64) -> f64 + Copy,
) -> Result<Value, String> {
    if arguments.len() != 2 {
        return Err(format!("{name} expects exactly 2 arguments"));
    }
    arguments[0].binary(&arguments[1], operation)
}

fn variadic(
    name: &str,
    arguments: &[Value],
    operation: impl Fn(f64, f64) -> f64 + Copy,
) -> Result<Value, String> {
    let Some((first, remaining)) = arguments.split_first() else {
        return Err(format!("{name} expects at least 1 argument"));
    };
    remaining.iter().try_fold(first.clone(), |result, value| {
        result.binary(value, operation)
    })
}

fn parse_axis(name: &str, arguments: &[Value]) -> Result<Option<usize>, String> {
    if !(1..=2).contains(&arguments.len()) {
        return Err(format!("{name} expects 1 or 2 arguments"));
    }
    let Some(axis) = arguments.get(1) else {
        return Ok(None);
    };
    let axis = axis
        .as_scalar()
        .ok_or_else(|| format!("{name} axis must be a non-negative integer"))?;
    if axis < 0.0 || axis.fract() != 0.0 {
        return Err(format!("{name} axis must be a non-negative integer"));
    }
    Ok(Some(axis as usize))
}

fn tensor_argument<'a>(name: &str, arguments: &'a [Value]) -> Result<&'a crate::Tensor, String> {
    arguments[0]
        .as_tensor()
        .ok_or_else(|| format!("{name} expects a vector or matrix"))
}

fn reduce_sum(arguments: &[Value]) -> Result<Value, String> {
    let axis = parse_axis("sum", arguments)?;
    let tensor = tensor_argument("sum", arguments)?;
    match (tensor.shape(), axis) {
        ([length], None | Some(0)) => {
            debug_assert_eq!(*length, tensor.elements().len());
            Ok(Value::scalar(tensor.elements().iter().sum()))
        }
        ([rows, columns], None) => {
            debug_assert_eq!(*rows * *columns, tensor.elements().len());
            Ok(Value::scalar(tensor.elements().iter().sum()))
        }
        ([rows, columns], Some(0)) => {
            if *columns == 0 {
                return Value::tensor(vec![0], Vec::new());
            }
            let mut sums = vec![0.0; *columns];
            for row in tensor.elements().chunks(*columns) {
                for (column, value) in row.iter().enumerate() {
                    sums[column] += value;
                }
            }
            debug_assert_eq!(tensor.elements().len(), *rows * *columns);
            Value::tensor(vec![*columns], sums)
        }
        ([rows, columns], Some(1)) => {
            if *columns == 0 {
                return Value::tensor(vec![*rows], vec![0.0; *rows]);
            }
            let sums = tensor
                .elements()
                .chunks(*columns)
                .map(|row| row.iter().sum())
                .collect();
            Value::tensor(vec![*rows], sums)
        }
        ([_], Some(_)) => Err("sum axis for vectors must be 0".to_string()),
        ([_, _], Some(_)) => Err("sum axis for matrices must be 0 or 1".to_string()),
        _ => Err("sum expects a vector or matrix".to_string()),
    }
}

fn reduce_average(arguments: &[Value]) -> Result<Value, String> {
    let axis = parse_axis("average", arguments)?;
    let tensor = tensor_argument("average", arguments)?;
    match (tensor.shape(), axis) {
        ([length], None | Some(0)) if *length > 0 => Ok(Value::scalar(
            tensor.elements().iter().sum::<f64>() / *length as f64,
        )),
        ([rows, columns], None) if *rows > 0 && *columns > 0 => Ok(Value::scalar(
            tensor.elements().iter().sum::<f64>() / (*rows * *columns) as f64,
        )),
        ([rows, _columns], Some(0)) if *rows > 0 => {
            let sums = reduce_sum(arguments)?;
            Ok(sums.unary(|value| value / *rows as f64))
        }
        ([_rows, columns], Some(1)) if *columns > 0 => {
            let sums = reduce_sum(arguments)?;
            Ok(sums.unary(|value| value / *columns as f64))
        }
        ([length], None | Some(0)) if *length == 0 => {
            Err("average expects a non-empty vector".to_string())
        }
        ([rows, columns], _) if *rows == 0 || *columns == 0 => {
            Err("average expects a non-empty matrix".to_string())
        }
        ([_], Some(_)) => Err("average axis for vectors must be 0".to_string()),
        ([_, _], Some(_)) => Err("average axis for matrices must be 0 or 1".to_string()),
        _ => Err("average expects a vector or matrix".to_string()),
    }
}

fn reduce_count(arguments: &[Value]) -> Result<Value, String> {
    let axis = parse_axis("count", arguments)?;
    let tensor = tensor_argument("count", arguments)?;
    let flags = Value::tensor(
        tensor.shape().to_vec(),
        tensor
            .elements()
            .iter()
            .map(|value| if *value != 0.0 { 1.0 } else { 0.0 })
            .collect(),
    )?;
    let mut count_arguments = vec![flags];
    if let Some(axis) = axis {
        count_arguments.push(Value::scalar(axis as f64));
    }
    reduce_sum(&count_arguments)
}

fn size(arguments: &[Value]) -> Result<Value, String> {
    let axis = parse_axis("size", arguments)?;
    let tensor = tensor_argument("size", arguments)?;
    if let Some(axis) = axis {
        return tensor
            .shape()
            .get(axis)
            .copied()
            .map(|value| Value::scalar(value as f64))
            .ok_or_else(|| format!("size axis must be between 0 and {}", tensor.rank() - 1));
    }
    if tensor.rank() == 1 {
        return Ok(Value::scalar(tensor.shape()[0] as f64));
    }
    Value::tensor(
        vec![tensor.rank()],
        tensor
            .shape()
            .iter()
            .map(|dimension| *dimension as f64)
            .collect(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reducers_preserve_expected_matrix_axes() {
        let matrix =
            Value::tensor(vec![2, 2], vec![1.0, 2.0, 3.0, 4.0]).expect("matrix should be valid");

        assert_eq!(
            evaluate("sum", std::slice::from_ref(&matrix), None).expect("sum should work"),
            Value::scalar(10.0)
        );
        assert_eq!(
            evaluate("sum", &[matrix.clone(), Value::scalar(1.0)], None)
                .expect("row sums should work")
                .as_tensor()
                .expect("row sums should be a tensor")
                .elements(),
            &[3.0, 7.0]
        );
        assert_eq!(
            evaluate("average", &[matrix], None).expect("average should work"),
            Value::scalar(2.5)
        );
    }

    #[test]
    fn append_joins_vectors_rows_and_columns() {
        let vector = Value::tensor(vec![2], vec![1.0, 2.0]).expect("vector should be valid");
        assert_eq!(
            evaluate(
                "append",
                &[Value::scalar(0.0), vector.clone(), Value::scalar(3.0)],
                None,
            )
            .expect("vectors should append"),
            Value::tensor(vec![4], vec![0.0, 1.0, 2.0, 3.0]).expect("tensor should be valid")
        );

        let matrix =
            Value::tensor(vec![2, 2], vec![1.0, 2.0, 3.0, 4.0]).expect("matrix should be valid");
        assert_eq!(
            evaluate("append", &[matrix.clone(), vector.clone()], None)
                .expect("row should append"),
            Value::tensor(vec![3, 2], vec![1.0, 2.0, 3.0, 4.0, 1.0, 2.0])
                .expect("tensor should be valid")
        );
        assert_eq!(
            evaluate("append", &[matrix, vector, Value::scalar(1.0)], None)
                .expect("column should append"),
            Value::tensor(vec![2, 3], vec![1.0, 2.0, 1.0, 3.0, 4.0, 2.0])
                .expect("tensor should be valid")
        );
    }

    #[test]
    fn range_matches_stgraphx_sequence_rules() {
        assert_eq!(
            evaluate("range", &[Value::scalar(4.0)], None)
                .expect("single argument should work"),
            Value::tensor(vec![4], vec![0.0, 1.0, 2.0, 3.0]).expect("tensor should be valid")
        );
        assert_eq!(
            evaluate(
                "range",
                &[Value::scalar(3.0), Value::scalar(0.0)],
                None,
            )
                .expect("descending range should work"),
            Value::tensor(vec![3], vec![3.0, 2.0, 1.0]).expect("tensor should be valid")
        );
        assert_eq!(
            evaluate(
                "range",
                &[Value::scalar(0.0), Value::scalar(0.31), Value::scalar(0.1),],
                None,
            )
            .expect("fractional range should work"),
            Value::tensor(vec![4], vec![0.0, 0.1, 0.2, 0.3]).expect("tensor should be valid")
        );
        assert_eq!(
            evaluate(
                "range",
                &[Value::scalar(0.0), Value::scalar(1.0), Value::scalar(-0.1),],
                None,
            )
            .expect_err("wrong direction should fail"),
            "range step does not reach the end value"
        );
    }

    #[test]
    fn random_functions_use_inclusive_integer_bounds_and_shared_state() {
        let random = RandomGenerator::new(Some(123_456_789));

        assert_eq!(
            evaluate("rand", &[], Some(&random)),
            Ok(Value::scalar(0.257_790_743_838_995_7))
        );
        assert_eq!(
            evaluate("rand", &[Value::scalar(10.0)], Some(&random)),
            Ok(Value::scalar(9.707_721_115_555_614))
        );
        assert_eq!(
            evaluate(
                "randInt",
                &[Value::scalar(-2.0), Value::scalar(2.0)],
                Some(&random),
            ),
            Ok(Value::scalar(1.0))
        );
    }
}
