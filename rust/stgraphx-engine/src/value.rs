// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

use std::fmt;

/// A rectangular, numeric, row-major tensor.
#[derive(Debug, Clone, PartialEq)]
pub struct Tensor {
    shape: Vec<usize>,
    elements: Vec<f64>,
}

impl Tensor {
    /// Creates a tensor after checking that shape and element count agree.
    pub fn new(shape: Vec<usize>, elements: Vec<f64>) -> Result<Self, String> {
        if shape.is_empty() {
            return Err("a tensor must have at least one dimension".to_string());
        }
        let expected = shape.iter().try_fold(1usize, |size, dimension| {
            size.checked_mul(*dimension)
                .ok_or_else(|| "tensor shape is too large".to_string())
        })?;
        if expected != elements.len() {
            return Err(format!(
                "tensor shape requires {expected} elements, found {}",
                elements.len()
            ));
        }
        Ok(Self { shape, elements })
    }

    pub fn shape(&self) -> &[usize] {
        &self.shape
    }

    pub fn elements(&self) -> &[f64] {
        &self.elements
    }

    pub fn rank(&self) -> usize {
        self.shape.len()
    }

    fn map(&self, operation: impl Fn(f64) -> f64) -> Self {
        Self {
            shape: self.shape.clone(),
            elements: self.elements.iter().copied().map(operation).collect(),
        }
    }

    fn zip_map(&self, other: &Self, operation: impl Fn(f64, f64) -> f64) -> Result<Self, String> {
        if self.shape != other.shape {
            return Err("operator arguments must have matching shapes".to_string());
        }
        Ok(Self {
            shape: self.shape.clone(),
            elements: self
                .elements
                .iter()
                .copied()
                .zip(other.elements.iter().copied())
                .map(|(left, right)| operation(left, right))
                .collect(),
        })
    }

    fn format_dimension(
        &self,
        formatter: &mut fmt::Formatter<'_>,
        dimension: usize,
        offset: usize,
    ) -> fmt::Result {
        formatter.write_str("[")?;
        let count = self.shape[dimension];
        let stride = self.shape[dimension + 1..].iter().product::<usize>();
        for index in 0..count {
            if index > 0 {
                formatter.write_str(",")?;
            }
            if dimension + 1 == self.shape.len() {
                write!(formatter, "{}", self.elements[offset + index])?;
            } else {
                self.format_dimension(formatter, dimension + 1, offset + index * stride)?;
            }
        }
        formatter.write_str("]")
    }
}

/// Numeric value produced by the execution engine.
#[derive(Debug, Clone, PartialEq)]
pub enum Value {
    Scalar(f64),
    Tensor(Tensor),
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) enum TensorAccessor {
    Index(Value),
    Slice {
        start: Option<f64>,
        end: Option<f64>,
        step: Option<f64>,
    },
}

enum AxisSelection {
    One(usize),
    Many(Vec<usize>),
}

impl Value {
    pub fn scalar(value: f64) -> Self {
        Self::Scalar(value)
    }

    pub fn tensor(shape: Vec<usize>, elements: Vec<f64>) -> Result<Self, String> {
        Tensor::new(shape, elements).map(Self::Tensor)
    }

    pub fn as_scalar(&self) -> Option<f64> {
        match self {
            Self::Scalar(value) => Some(*value),
            Self::Tensor(_) => None,
        }
    }

    pub fn as_tensor(&self) -> Option<&Tensor> {
        match self {
            Self::Scalar(_) => None,
            Self::Tensor(tensor) => Some(tensor),
        }
    }

    pub fn is_finite(&self) -> bool {
        match self {
            Self::Scalar(value) => value.is_finite(),
            Self::Tensor(tensor) => tensor.elements.iter().all(|value| value.is_finite()),
        }
    }

    pub(crate) fn truthy(&self) -> Result<bool, String> {
        match self {
            Self::Scalar(value) => Ok(*value != 0.0),
            Self::Tensor(_) => Err("a tensor cannot be used as one scalar condition".to_string()),
        }
    }

    pub(crate) fn from_array_elements(elements: Vec<Self>) -> Result<Self, String> {
        if elements.is_empty() {
            return Self::tensor(vec![0], Vec::new());
        }

        match &elements[0] {
            Self::Scalar(_) => {
                let mut data = Vec::with_capacity(elements.len());
                for element in elements {
                    let Self::Scalar(value) = element else {
                        return Err(
                            "array literal must have a rectangular numeric shape".to_string()
                        );
                    };
                    data.push(value);
                }
                Self::tensor(vec![data.len()], data)
            }
            Self::Tensor(first) => {
                let child_shape = first.shape.clone();
                let child_size = first.elements.len();
                let mut data = Vec::with_capacity(elements.len() * child_size);
                let count = elements.len();
                for element in elements {
                    let Self::Tensor(tensor) = element else {
                        return Err(
                            "array literal must have a rectangular numeric shape".to_string()
                        );
                    };
                    if tensor.shape != child_shape {
                        return Err(
                            "array literal must have a rectangular numeric shape".to_string()
                        );
                    }
                    data.extend(tensor.elements);
                }
                let mut shape = Vec::with_capacity(child_shape.len() + 1);
                shape.push(count);
                shape.extend(child_shape);
                Self::tensor(shape, data)
            }
        }
    }

    pub(crate) fn unary(&self, operation: impl Fn(f64) -> f64) -> Self {
        match self {
            Self::Scalar(value) => Self::Scalar(operation(*value)),
            Self::Tensor(tensor) => Self::Tensor(tensor.map(operation)),
        }
    }

    pub(crate) fn binary(
        &self,
        other: &Self,
        operation: impl Fn(f64, f64) -> f64 + Copy,
    ) -> Result<Self, String> {
        match (self, other) {
            (Self::Scalar(left), Self::Scalar(right)) => Ok(Self::Scalar(operation(*left, *right))),
            (Self::Tensor(left), Self::Tensor(right)) => {
                left.zip_map(right, operation).map(Self::Tensor)
            }
            (Self::Tensor(left), Self::Scalar(right)) => {
                Ok(Self::Tensor(left.map(|value| operation(value, *right))))
            }
            (Self::Scalar(left), Self::Tensor(right)) => {
                Ok(Self::Tensor(right.map(|value| operation(*left, value))))
            }
        }
    }

    pub(crate) fn euler_integrate(&self, derivative: &Self, dt: f64) -> Result<Self, String> {
        match (self, derivative) {
            (Self::Scalar(current), Self::Scalar(delta)) => Ok(Self::Scalar(current + delta * dt)),
            (Self::Tensor(current), Self::Tensor(delta)) => current
                .zip_map(delta, |value, derivative| value + derivative * dt)
                .map(Self::Tensor),
            _ => Err("integral requires matching numeric state and derivative".to_string()),
        }
    }

    pub(crate) fn rk4_integrate(
        &self,
        k1: &Self,
        k2: &Self,
        k3: &Self,
        k4: &Self,
        dt: f64,
    ) -> Result<Self, String> {
        match (self, k1, k2, k3, k4) {
            (
                Self::Scalar(current),
                Self::Scalar(k1),
                Self::Scalar(k2),
                Self::Scalar(k3),
                Self::Scalar(k4),
            ) => Ok(Self::Scalar(
                current + (dt / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4),
            )),
            (
                Self::Tensor(current),
                Self::Tensor(k1),
                Self::Tensor(k2),
                Self::Tensor(k3),
                Self::Tensor(k4),
            ) if [k1, k2, k3, k4]
                .iter()
                .all(|derivative| derivative.shape == current.shape) =>
            {
                let elements = current
                    .elements
                    .iter()
                    .zip(&k1.elements)
                    .zip(&k2.elements)
                    .zip(&k3.elements)
                    .zip(&k4.elements)
                    .map(|((((current, k1), k2), k3), k4)| {
                        current + (dt / 6.0) * (k1 + 2.0 * k2 + 2.0 * k3 + k4)
                    })
                    .collect();
                Self::tensor(current.shape.clone(), elements)
            }
            _ => Err("RK4 requires matching numeric state and derivative shapes".to_string()),
        }
    }

    pub(crate) fn select(
        condition: &Self,
        when_true: &Self,
        when_false: &Self,
    ) -> Result<Self, String> {
        let Self::Tensor(condition) = condition else {
            return if condition.truthy()? {
                Ok(when_true.clone())
            } else {
                Ok(when_false.clone())
            };
        };

        let branch_elements = |value: &Self| -> Result<Vec<f64>, String> {
            match value {
                Self::Scalar(scalar) => Ok(vec![*scalar; condition.elements.len()]),
                Self::Tensor(tensor) if tensor.shape == condition.shape => {
                    Ok(tensor.elements.clone())
                }
                Self::Tensor(_) => Err("if arguments must have matching shapes".to_string()),
            }
        };
        let true_elements = branch_elements(when_true)?;
        let false_elements = branch_elements(when_false)?;
        let elements = condition
            .elements
            .iter()
            .zip(true_elements)
            .zip(false_elements)
            .map(|((condition, when_true), when_false)| {
                if *condition != 0.0 {
                    when_true
                } else {
                    when_false
                }
            })
            .collect();
        Self::tensor(condition.shape.clone(), elements)
    }

    pub(crate) fn access(&self, accessors: &[TensorAccessor]) -> Result<Self, String> {
        let Self::Tensor(tensor) = self else {
            return Err("indexing requires an array or matrix".to_string());
        };
        tensor.access(accessors)
    }
}

impl Tensor {
    fn access(&self, accessors: &[TensorAccessor]) -> Result<Value, String> {
        if accessors.is_empty() {
            return Ok(Value::Tensor(self.clone()));
        }
        if accessors.len() > self.rank() {
            return Err("too many tensor indices".to_string());
        }

        if self.rank() == 2 && accessors.len() == 1 {
            if let TensorAccessor::Index(Value::Tensor(indices)) = &accessors[0] {
                if indices.shape() == [2] {
                    let row = normalize_index(indices.elements()[0], self.shape[0], 0, 2)?;
                    let column = normalize_index(indices.elements()[1], self.shape[1], 1, 2)?;
                    return Ok(Value::scalar(self.elements[row * self.shape[1] + column]));
                }
                if indices.rank() == 2 && indices.shape()[1] == 2 {
                    let mut selected = Vec::with_capacity(indices.shape()[0]);
                    for pair in indices.elements().chunks_exact(2) {
                        let row = normalize_index(pair[0], self.shape[0], 0, 2)?;
                        let column = normalize_index(pair[1], self.shape[1], 1, 2)?;
                        selected.push(self.elements[row * self.shape[1] + column]);
                    }
                    return Value::tensor(vec![indices.shape()[0]], selected);
                }
            }
        }

        let mut selections = Vec::with_capacity(self.rank());
        let mut output_shape = Vec::with_capacity(self.rank());
        for axis in 0..self.rank() {
            let selection = match accessors.get(axis) {
                Some(TensorAccessor::Index(value)) => match value {
                    Value::Scalar(index) => AxisSelection::One(normalize_index(
                        *index,
                        self.shape[axis],
                        axis,
                        self.rank(),
                    )?),
                    Value::Tensor(indices) if indices.rank() == 1 => {
                        let selected = indices
                            .elements()
                            .iter()
                            .map(|index| {
                                normalize_index(*index, self.shape[axis], axis, self.rank())
                            })
                            .collect::<Result<Vec<_>, _>>()?;
                        output_shape.push(selected.len());
                        AxisSelection::Many(selected)
                    }
                    Value::Tensor(_) => {
                        return Err(
                            "array index must be an integer or a vector of integers".to_string()
                        )
                    }
                },
                Some(TensorAccessor::Slice { start, end, step }) => {
                    let selected = slice_indices(self.shape[axis], *start, *end, *step)?;
                    output_shape.push(selected.len());
                    AxisSelection::Many(selected)
                }
                None => {
                    output_shape.push(self.shape[axis]);
                    AxisSelection::Many((0..self.shape[axis]).collect())
                }
            };
            selections.push(selection);
        }

        let mut strides = vec![1; self.rank()];
        for axis in (0..self.rank().saturating_sub(1)).rev() {
            strides[axis] = strides[axis + 1] * self.shape[axis + 1];
        }
        let mut elements = Vec::new();
        self.collect_selection(&selections, &strides, 0, 0, &mut elements);

        if output_shape.is_empty() {
            return elements
                .into_iter()
                .next()
                .map(Value::scalar)
                .ok_or_else(|| "tensor index selected no value".to_string());
        }
        Value::tensor(output_shape, elements)
    }

    fn collect_selection(
        &self,
        selections: &[AxisSelection],
        strides: &[usize],
        axis: usize,
        offset: usize,
        output: &mut Vec<f64>,
    ) {
        if axis == selections.len() {
            output.push(self.elements[offset]);
            return;
        }
        match &selections[axis] {
            AxisSelection::One(index) => self.collect_selection(
                selections,
                strides,
                axis + 1,
                offset + index * strides[axis],
                output,
            ),
            AxisSelection::Many(indices) => {
                for index in indices {
                    self.collect_selection(
                        selections,
                        strides,
                        axis + 1,
                        offset + index * strides[axis],
                        output,
                    );
                }
            }
        }
    }
}

fn integer(value: f64, message: &str) -> Result<isize, String> {
    let converted = value as isize;
    if !value.is_finite() || converted as f64 != value {
        return Err(message.to_string());
    }
    Ok(converted)
}

fn normalize_index(value: f64, length: usize, axis: usize, rank: usize) -> Result<usize, String> {
    let integer_message = if rank == 2 {
        "matrix index must be a pair of integers"
    } else {
        "array index must be an integer"
    };
    let mut index = integer(value, integer_message)?;
    if index < 0 {
        index += length as isize;
    }
    if index < 0 || index >= length as isize {
        let message = match (rank, axis) {
            (2, 0) => "matrix row index out of range",
            (2, 1) => "matrix column index out of range",
            _ => "array index out of range",
        };
        return Err(message.to_string());
    }
    Ok(index as usize)
}

fn normalize_slice_bound(
    value: Option<f64>,
    length: usize,
    fallback: isize,
) -> Result<isize, String> {
    let Some(value) = value else {
        return Ok(fallback);
    };
    let mut index = integer(value, "slice bounds must be integers")?;
    if index < 0 {
        index += length as isize;
    }
    Ok(index)
}

fn slice_indices(
    length: usize,
    start: Option<f64>,
    end: Option<f64>,
    step: Option<f64>,
) -> Result<Vec<usize>, String> {
    let step = integer(step.unwrap_or(1.0), "slice step must be a non-zero integer")?;
    if step == 0 {
        return Err("slice step must be a non-zero integer".to_string());
    }
    let length = length as isize;
    let mut indices = Vec::new();
    if step > 0 {
        let mut index = normalize_slice_bound(start, length as usize, 0)?.max(0);
        let end = normalize_slice_bound(end, length as usize, length)?.min(length);
        while index < end {
            indices.push(index as usize);
            let Some(next) = index.checked_add(step) else {
                break;
            };
            index = next;
        }
    } else {
        let mut index = normalize_slice_bound(start, length as usize, length - 1)?.min(length - 1);
        let end = normalize_slice_bound(end, length as usize, -1)?.max(-1);
        while index > end {
            indices.push(index as usize);
            let Some(next) = index.checked_add(step) else {
                break;
            };
            index = next;
        }
    }
    Ok(indices)
}

impl fmt::Display for Tensor {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        self.format_dimension(formatter, 0, 0)
    }
}

impl fmt::Display for Value {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Scalar(value) => write!(formatter, "{value}"),
            Self::Tensor(tensor) => fmt::Display::fmt(tensor, formatter),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nested_array_elements_form_a_rectangular_tensor() {
        let first = Value::from_array_elements(vec![Value::scalar(1.0), Value::scalar(2.0)])
            .expect("row should be valid");
        let second = Value::from_array_elements(vec![Value::scalar(3.0), Value::scalar(4.0)])
            .expect("row should be valid");
        let matrix =
            Value::from_array_elements(vec![first, second]).expect("matrix should be valid");
        let tensor = matrix.as_tensor().expect("matrix should be a tensor");

        assert_eq!(tensor.shape(), &[2, 2]);
        assert_eq!(tensor.elements(), &[1.0, 2.0, 3.0, 4.0]);
        assert_eq!(matrix.to_string(), "[[1,2],[3,4]]");
    }

    #[test]
    fn scalar_operations_are_broadcast_over_tensors() {
        let vector = Value::tensor(vec![2], vec![1.0, 2.0]).expect("vector should be valid");
        let result = vector
            .binary(&Value::scalar(10.0), |left, right| left + right)
            .expect("broadcast should succeed");

        assert_eq!(
            result
                .as_tensor()
                .expect("result should be a tensor")
                .elements(),
            &[11.0, 12.0]
        );
    }
}
