// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

use crate::value::Value;

pub(crate) fn evaluate(name: &str, arguments: &[Value]) -> Result<Value, String> {
    match name {
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
        "min" => variadic(name, arguments, f64::min),
        "max" => variadic(name, arguments, f64::max),
        "sum" => reduce_sum(arguments),
        "average" => reduce_average(arguments),
        "count" => reduce_count(arguments),
        "size" => size(arguments),
        _ => Err(format!("unsupported function '{name}'")),
    }
}

fn unary(
    name: &str,
    arguments: &[Value],
    operation: impl Fn(f64) -> f64,
) -> Result<Value, String> {
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
    remaining
        .iter()
        .try_fold(first.clone(), |result, value| {
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
            evaluate("sum", &[matrix.clone()]).expect("sum should work"),
            Value::scalar(10.0)
        );
        assert_eq!(
            evaluate("sum", &[matrix.clone(), Value::scalar(1.0)])
                .expect("row sums should work")
                .as_tensor()
                .expect("row sums should be a tensor")
                .elements(),
            &[3.0, 7.0]
        );
        assert_eq!(
            evaluate("average", &[matrix]).expect("average should work"),
            Value::scalar(2.5)
        );
    }
}
