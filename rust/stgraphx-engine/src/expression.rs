// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

use std::collections::{BTreeSet, HashMap};

use crate::functions;
use crate::random::RandomGenerator;
use crate::value::{TensorAccessor, Value};

#[derive(Debug, Clone, PartialEq)]
pub(crate) enum Expression {
    Number(f64),
    Identifier(String),
    Array(Vec<Expression>),
    Integral(Box<Expression>),
    Call {
        name: String,
        arguments: Vec<Expression>,
    },
    Access {
        target: Box<Expression>,
        accessors: Vec<Accessor>,
    },
    Unary {
        operator: UnaryOperator,
        argument: Box<Expression>,
    },
    Binary {
        operator: BinaryOperator,
        left: Box<Expression>,
        right: Box<Expression>,
    },
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) enum Accessor {
    Index(Box<Expression>),
    Slice {
        start: Option<Box<Expression>>,
        end: Option<Box<Expression>>,
        step: Option<Box<Expression>>,
    },
}

#[derive(Debug, Clone)]
pub(crate) struct LocalFunction {
    pub(crate) params: Vec<String>,
    pub(crate) expression: Expression,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum UnaryOperator {
    Plus,
    Minus,
    Not,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum BinaryOperator {
    Add,
    Subtract,
    Multiply,
    Divide,
    Remainder,
    Power,
    Less,
    Greater,
    LessOrEqual,
    GreaterOrEqual,
    Equal,
    NotEqual,
    LogicalAnd,
    LogicalOr,
}

impl Expression {
    pub(crate) fn references(&self) -> BTreeSet<String> {
        let mut references = BTreeSet::new();
        self.collect_references(&mut references);
        references
    }

    fn collect_references(&self, references: &mut BTreeSet<String>) {
        match self {
            Self::Number(_) => {}
            Self::Identifier(name) => {
                references.insert(name.clone());
            }
            Self::Array(elements) => {
                for element in elements {
                    element.collect_references(references);
                }
            }
            Self::Integral(argument) => argument.collect_references(references),
            Self::Call { name, arguments } if name == "array" && arguments.len() >= 2 => {
                for argument in &arguments[..arguments.len() - 1] {
                    argument.collect_references(references);
                }
                let mut body_references = BTreeSet::new();
                arguments[arguments.len() - 1].collect_references(&mut body_references);
                for index in 0..arguments.len() - 1 {
                    body_references.remove(&format!("${index}"));
                    body_references.remove(&format!("$i{index}"));
                }
                references.extend(body_references);
            }
            Self::Call { arguments, .. } => {
                for argument in arguments {
                    argument.collect_references(references);
                }
            }
            Self::Access { target, accessors } => {
                target.collect_references(references);
                for accessor in accessors {
                    accessor.collect_references(references);
                }
            }
            Self::Unary { argument, .. } => argument.collect_references(references),
            Self::Binary { left, right, .. } => {
                left.collect_references(references);
                right.collect_references(references);
            }
        }
    }

    pub(crate) fn calls(&self) -> BTreeSet<String> {
        let mut calls = BTreeSet::new();
        self.collect_calls(&mut calls);
        calls
    }

    fn collect_calls(&self, calls: &mut BTreeSet<String>) {
        match self {
            Self::Call { name, arguments } => {
                calls.insert(name.clone());
                for argument in arguments {
                    argument.collect_calls(calls);
                }
            }
            Self::Array(elements) => {
                for element in elements {
                    element.collect_calls(calls);
                }
            }
            Self::Integral(argument) | Self::Unary { argument, .. } => {
                argument.collect_calls(calls)
            }
            Self::Access { target, accessors } => {
                target.collect_calls(calls);
                for accessor in accessors {
                    accessor.collect_calls(calls);
                }
            }
            Self::Binary { left, right, .. } => {
                left.collect_calls(calls);
                right.collect_calls(calls);
            }
            Self::Number(_) | Self::Identifier(_) => {}
        }
    }

    pub(crate) fn uses_integral(&self) -> bool {
        match self {
            Self::Integral(_) => true,
            Self::Array(elements) => elements.iter().any(Self::uses_integral),
            Self::Call { arguments, .. } => arguments.iter().any(Self::uses_integral),
            Self::Access { target, accessors } => {
                target.uses_integral() || accessors.iter().any(Accessor::uses_integral)
            }
            Self::Unary { argument, .. } => argument.uses_integral(),
            Self::Binary { left, right, .. } => left.uses_integral() || right.uses_integral(),
            Self::Number(_) | Self::Identifier(_) => false,
        }
    }

    pub(crate) fn pure_integral_argument(&self) -> Option<&Expression> {
        match self {
            Self::Integral(argument) => Some(argument),
            _ => None,
        }
    }

    pub(crate) fn uses_identifier(&self, expected: &str) -> bool {
        match self {
            Self::Identifier(name) => name == expected,
            Self::Array(elements) => elements
                .iter()
                .any(|element| element.uses_identifier(expected)),
            Self::Call { arguments, .. } => arguments
                .iter()
                .any(|argument| argument.uses_identifier(expected)),
            Self::Access { target, accessors } => {
                target.uses_identifier(expected)
                    || accessors
                        .iter()
                        .any(|accessor| accessor.uses_identifier(expected))
            }
            Self::Integral(argument) | Self::Unary { argument, .. } => {
                argument.uses_identifier(expected)
            }
            Self::Binary { left, right, .. } => {
                left.uses_identifier(expected) || right.uses_identifier(expected)
            }
            Self::Number(_) => false,
        }
    }

    pub(crate) fn evaluate(&self, context: &EvaluationContext<'_>) -> Result<Value, String> {
        match self {
            Self::Number(value) => Ok(Value::scalar(*value)),
            Self::Identifier(name) => match name.as_str() {
                "time" => Ok(Value::scalar(context.time)),
                "t0" => Ok(Value::scalar(context.t0)),
                "t1" => Ok(Value::scalar(context.t1)),
                "dt" => Ok(Value::scalar(context.dt)),
                "this" => context
                    .self_value
                    .cloned()
                    .ok_or_else(|| "'this' is only available in state transitions".to_string()),
                _ => context
                    .local_values
                    .and_then(|values| values.get(name))
                    .or_else(|| context.values.get(name))
                    .cloned()
                    .ok_or_else(|| format!("'{name}' has no computed value")),
            },
            Self::Array(elements) => {
                let values = elements
                    .iter()
                    .map(|element| element.evaluate(context))
                    .collect::<Result<Vec<_>, _>>()?;
                Value::from_array_elements(values)
            }
            Self::Integral(argument) => {
                if !context.allow_integral {
                    return Err("'integral' is only available in state transitions".to_string());
                }
                let current = context.self_value.ok_or_else(|| {
                    "'integral' requires the current value of a state node".to_string()
                })?;
                current.euler_integrate(&argument.evaluate(context)?, context.dt)
            }
            Self::Call { name, arguments } => {
                if name == "if" {
                    return evaluate_conditional(arguments, context);
                }
                if name == "array" {
                    return evaluate_generated_array(arguments, context);
                }
                let values = arguments
                    .iter()
                    .map(|argument| argument.evaluate(context))
                    .collect::<Result<Vec<_>, _>>()?;
                if let Some(function) = context.local_functions.get(name) {
                    if context
                        .local_function_stack
                        .iter()
                        .any(|active| active == name)
                    {
                        return Err(format!("local function recursion is not allowed: {name}"));
                    }
                    if values.len() != function.params.len() {
                        return Err(format!(
                            "{name} expects exactly {} arguments",
                            function.params.len()
                        ));
                    }
                    let local_values = function
                        .params
                        .iter()
                        .cloned()
                        .zip(values)
                        .collect::<HashMap<_, _>>();
                    let mut stack = context.local_function_stack.to_vec();
                    stack.push(name.clone());
                    return function.expression.evaluate(&EvaluationContext {
                        values: &local_values,
                        time: context.time,
                        t0: context.t0,
                        t1: context.t1,
                        dt: context.dt,
                        self_value: None,
                        allow_integral: false,
                        local_values: None,
                        local_functions: context.local_functions,
                        local_function_stack: &stack,
                        random: context.random,
                    });
                }
                functions::evaluate(name, &values, context.random)
            }
            Self::Access { target, accessors } => {
                let target = target.evaluate(context)?;
                let accessors = accessors
                    .iter()
                    .map(|accessor| accessor.evaluate(context))
                    .collect::<Result<Vec<_>, _>>()?;
                target.access(&accessors)
            }
            Self::Unary { operator, argument } => {
                let value = argument.evaluate(context)?;
                Ok(match operator {
                    UnaryOperator::Plus => value,
                    UnaryOperator::Minus => value.unary(|item| -item),
                    UnaryOperator::Not => value.unary(|item| if item == 0.0 { 1.0 } else { 0.0 }),
                })
            }
            Self::Binary {
                operator,
                left,
                right,
            } => {
                let left = left.evaluate(context)?;
                let right = right.evaluate(context)?;
                match operator {
                    BinaryOperator::Add => left.binary(&right, |left, right| left + right),
                    BinaryOperator::Subtract => left.binary(&right, |left, right| left - right),
                    BinaryOperator::Multiply => left.binary(&right, |left, right| left * right),
                    BinaryOperator::Divide => left.binary(&right, |left, right| left / right),
                    BinaryOperator::Remainder => left.binary(&right, euclidean_remainder),
                    BinaryOperator::Power => left.binary(&right, |left, right| left.powf(right)),
                    BinaryOperator::Less => {
                        left.binary(&right, |left, right| bool_number(left < right))
                    }
                    BinaryOperator::Greater => {
                        left.binary(&right, |left, right| bool_number(left > right))
                    }
                    BinaryOperator::LessOrEqual => {
                        left.binary(&right, |left, right| bool_number(left <= right))
                    }
                    BinaryOperator::GreaterOrEqual => {
                        left.binary(&right, |left, right| bool_number(left >= right))
                    }
                    BinaryOperator::Equal => {
                        left.binary(&right, |left, right| bool_number(left == right))
                    }
                    BinaryOperator::NotEqual => {
                        left.binary(&right, |left, right| bool_number(left != right))
                    }
                    BinaryOperator::LogicalAnd => {
                        left.binary(&right, |left, right| if left != 0.0 { right } else { left })
                    }
                    BinaryOperator::LogicalOr => {
                        left.binary(&right, |left, right| if left != 0.0 { left } else { right })
                    }
                }
            }
        }
    }
}

impl Accessor {
    fn expressions(&self) -> impl Iterator<Item = &Expression> {
        let expressions: [Option<&Expression>; 3] = match self {
            Self::Index(index) => [Some(index), None, None],
            Self::Slice { start, end, step } => [start.as_deref(), end.as_deref(), step.as_deref()],
        };
        expressions.into_iter().flatten()
    }

    fn collect_references(&self, references: &mut BTreeSet<String>) {
        for expression in self.expressions() {
            expression.collect_references(references);
        }
    }

    fn collect_calls(&self, calls: &mut BTreeSet<String>) {
        for expression in self.expressions() {
            expression.collect_calls(calls);
        }
    }

    fn uses_integral(&self) -> bool {
        self.expressions().any(Expression::uses_integral)
    }

    fn uses_identifier(&self, expected: &str) -> bool {
        self.expressions()
            .any(|expression| expression.uses_identifier(expected))
    }

    fn evaluate(&self, context: &EvaluationContext<'_>) -> Result<TensorAccessor, String> {
        let scalar =
            |expression: &Option<Box<Expression>>, error: &str| -> Result<Option<f64>, String> {
                expression
                    .as_deref()
                    .map(|expression| {
                        expression
                            .evaluate(context)?
                            .as_scalar()
                            .ok_or_else(|| error.to_string())
                    })
                    .transpose()
            };
        match self {
            Self::Index(index) => Ok(TensorAccessor::Index(index.evaluate(context)?)),
            Self::Slice { start, end, step } => Ok(TensorAccessor::Slice {
                start: scalar(start, "slice bounds must be integers")?,
                end: scalar(end, "slice bounds must be integers")?,
                step: scalar(step, "slice step must be a non-zero integer")?,
            }),
        }
    }
}

fn bool_number(value: bool) -> f64 {
    f64::from(u8::from(value))
}

fn euclidean_remainder(left: f64, right: f64) -> f64 {
    if !right.is_finite() || right == 0.0 {
        return left % right;
    }
    let remainder = left % right;
    (remainder + right) % right
}

fn evaluate_conditional(
    arguments: &[Expression],
    context: &EvaluationContext<'_>,
) -> Result<Value, String> {
    if arguments.len() < 3 || arguments.len() % 2 == 0 {
        return Err(
            "if expects an odd number of arguments: condition, value pairs, and a default value"
                .to_string(),
        );
    }

    fn evaluate_from(
        arguments: &[Expression],
        index: usize,
        context: &EvaluationContext<'_>,
    ) -> Result<Value, String> {
        if index == arguments.len() - 1 {
            return arguments[index].evaluate(context);
        }
        let condition = arguments[index].evaluate(context)?;
        if condition.as_tensor().is_none() {
            if condition.truthy()? {
                return arguments[index + 1].evaluate(context);
            }
            return evaluate_from(arguments, index + 2, context);
        }
        let when_true = arguments[index + 1].evaluate(context)?;
        let when_false = evaluate_from(arguments, index + 2, context)?;
        Value::select(&condition, &when_true, &when_false)
    }

    evaluate_from(arguments, 0, context)
}

const MAX_GENERATED_ARRAY_ELEMENTS: usize = 100_000;

fn evaluate_generated_array(
    arguments: &[Expression],
    context: &EvaluationContext<'_>,
) -> Result<Value, String> {
    if arguments.len() < 2 {
        return Err("array expects at least one axis and an expression".to_string());
    }

    let mut axes = Vec::with_capacity(arguments.len() - 1);
    let mut total_size = 1usize;
    for (index, argument) in arguments[..arguments.len() - 1].iter().enumerate() {
        let axis = match argument.evaluate(context)? {
            Value::Scalar(size)
                if size.is_finite()
                    && size >= 0.0
                    && size.fract() == 0.0
                    && size <= MAX_GENERATED_ARRAY_ELEMENTS as f64 =>
            {
                (0..size as usize)
                    .map(|value| value as f64)
                    .collect::<Vec<_>>()
            }
            Value::Tensor(values) if values.rank() == 1 => values.elements().to_vec(),
            _ => {
                return Err(format!(
                    "array axis {index} must be a non-negative integer or a vector"
                ))
            }
        };
        total_size = total_size
            .checked_mul(axis.len().max(1))
            .ok_or_else(|| "array is too large".to_string())?;
        if total_size > MAX_GENERATED_ARRAY_ELEMENTS {
            return Err("array is too large".to_string());
        }
        axes.push(axis);
    }

    fn build(
        axes: &[Vec<f64>],
        level: usize,
        body: &Expression,
        context: &EvaluationContext<'_>,
        local_values: &HashMap<String, Value>,
    ) -> Result<Value, String> {
        if level == axes.len() {
            return body.evaluate(&EvaluationContext {
                values: context.values,
                time: context.time,
                t0: context.t0,
                t1: context.t1,
                dt: context.dt,
                self_value: context.self_value,
                allow_integral: context.allow_integral,
                local_values: Some(local_values),
                local_functions: context.local_functions,
                local_function_stack: context.local_function_stack,
                random: context.random,
            });
        }

        let mut elements = Vec::with_capacity(axes[level].len());
        for (index, value) in axes[level].iter().copied().enumerate() {
            let mut nested_values = local_values.clone();
            nested_values.insert(format!("${level}"), Value::scalar(value));
            nested_values.insert(format!("$i{level}"), Value::scalar(index as f64));
            elements.push(build(axes, level + 1, body, context, &nested_values)?);
        }
        Value::from_array_elements(elements)
    }

    let inherited_values = context.local_values.cloned().unwrap_or_default();
    build(
        &axes,
        0,
        &arguments[arguments.len() - 1],
        context,
        &inherited_values,
    )
}

pub(crate) struct EvaluationContext<'a> {
    pub(crate) values: &'a HashMap<String, Value>,
    pub(crate) time: f64,
    pub(crate) t0: f64,
    pub(crate) t1: f64,
    pub(crate) dt: f64,
    pub(crate) self_value: Option<&'a Value>,
    pub(crate) allow_integral: bool,
    pub(crate) local_values: Option<&'a HashMap<String, Value>>,
    pub(crate) local_functions: &'a HashMap<String, LocalFunction>,
    pub(crate) local_function_stack: &'a [String],
    pub(crate) random: Option<&'a RandomGenerator>,
}

#[derive(Debug, Clone, PartialEq)]
enum TokenKind {
    Number(f64),
    Identifier(String),
    Plus,
    Minus,
    Star,
    Slash,
    Percent,
    Power,
    LeftParen,
    RightParen,
    LeftBracket,
    RightBracket,
    Comma,
    Colon,
    Less,
    Greater,
    LessOrEqual,
    GreaterOrEqual,
    Equal,
    NotEqual,
    LogicalAnd,
    LogicalOr,
    Bang,
    End,
}

#[derive(Debug, Clone, PartialEq)]
struct Token {
    kind: TokenKind,
    position: usize,
}

pub(crate) fn parse(source: &str) -> Result<Expression, String> {
    Parser::new(tokenize(source)?).parse()
}

fn tokenize(source: &str) -> Result<Vec<Token>, String> {
    let bytes = source.as_bytes();
    let mut tokens = Vec::new();
    let mut index = 0;

    while index < bytes.len() {
        let current = bytes[index] as char;
        if current.is_ascii_whitespace() {
            index += 1;
            continue;
        }

        let position = index;
        let remaining = &source[index..];
        if remaining.starts_with("===") || remaining.starts_with("!==") {
            let kind = if remaining.starts_with("===") {
                TokenKind::Equal
            } else {
                TokenKind::NotEqual
            };
            tokens.push(Token { kind, position });
            index += 3;
            continue;
        }
        let two_character = if remaining.starts_with("<=") {
            Some(TokenKind::LessOrEqual)
        } else if remaining.starts_with(">=") {
            Some(TokenKind::GreaterOrEqual)
        } else if remaining.starts_with("==") {
            Some(TokenKind::Equal)
        } else if remaining.starts_with("!=") {
            Some(TokenKind::NotEqual)
        } else if remaining.starts_with("&&") {
            Some(TokenKind::LogicalAnd)
        } else if remaining.starts_with("||") {
            Some(TokenKind::LogicalOr)
        } else {
            None
        };
        if let Some(kind) = two_character {
            tokens.push(Token { kind, position });
            index += 2;
            continue;
        }
        let kind = match current {
            '+' => {
                index += 1;
                TokenKind::Plus
            }
            '-' => {
                index += 1;
                TokenKind::Minus
            }
            '*' => {
                index += 1;
                if index < bytes.len() && bytes[index] == b'*' {
                    index += 1;
                    TokenKind::Power
                } else {
                    TokenKind::Star
                }
            }
            '/' => {
                index += 1;
                TokenKind::Slash
            }
            '%' => {
                index += 1;
                TokenKind::Percent
            }
            '^' => {
                index += 1;
                TokenKind::Power
            }
            '(' => {
                index += 1;
                TokenKind::LeftParen
            }
            ')' => {
                index += 1;
                TokenKind::RightParen
            }
            '[' => {
                index += 1;
                TokenKind::LeftBracket
            }
            ']' => {
                index += 1;
                TokenKind::RightBracket
            }
            ',' => {
                index += 1;
                TokenKind::Comma
            }
            ':' => {
                index += 1;
                TokenKind::Colon
            }
            '<' => {
                index += 1;
                TokenKind::Less
            }
            '>' => {
                index += 1;
                TokenKind::Greater
            }
            '!' => {
                index += 1;
                TokenKind::Bang
            }
            '0'..='9' | '.' => {
                let start = index;
                let mut digit_count = 0;
                while index < bytes.len() && (bytes[index] as char).is_ascii_digit() {
                    digit_count += 1;
                    index += 1;
                }
                if index < bytes.len() && bytes[index] == b'.' {
                    index += 1;
                    while index < bytes.len() && (bytes[index] as char).is_ascii_digit() {
                        digit_count += 1;
                        index += 1;
                    }
                }
                if digit_count == 0 {
                    return Err(format!("invalid number at position {start}"));
                }
                if index < bytes.len() && matches!(bytes[index], b'e' | b'E') {
                    index += 1;
                    if index < bytes.len() && matches!(bytes[index], b'+' | b'-') {
                        index += 1;
                    }
                    let exponent_start = index;
                    while index < bytes.len() && (bytes[index] as char).is_ascii_digit() {
                        index += 1;
                    }
                    if exponent_start == index {
                        return Err(format!("invalid exponent at position {start}"));
                    }
                }
                let text = &source[start..index];
                let value = text
                    .parse::<f64>()
                    .map_err(|_| format!("invalid number '{text}' at position {start}"))?;
                if !value.is_finite() {
                    return Err(format!("non-finite number at position {start}"));
                }
                TokenKind::Number(value)
            }
            'A'..='Z' | 'a'..='z' | '_' | '$' => {
                let start = index;
                index += 1;
                while index < bytes.len() {
                    let character = bytes[index] as char;
                    if character.is_ascii_alphanumeric() || matches!(character, '_' | '$') {
                        index += 1;
                    } else {
                        break;
                    }
                }
                match &source[start..index] {
                    "and" => TokenKind::LogicalAnd,
                    "or" => TokenKind::LogicalOr,
                    "not" => TokenKind::Bang,
                    _ => TokenKind::Identifier(source[start..index].to_string()),
                }
            }
            _ => {
                return Err(format!(
                    "unexpected token '{current}' at position {position}"
                ))
            }
        };
        tokens.push(Token { kind, position });
    }

    tokens.push(Token {
        kind: TokenKind::End,
        position: source.len(),
    });
    Ok(tokens)
}

struct Parser {
    tokens: Vec<Token>,
    index: usize,
}

impl Parser {
    fn new(tokens: Vec<Token>) -> Self {
        Self { tokens, index: 0 }
    }

    fn parse(mut self) -> Result<Expression, String> {
        let expression = self.parse_logical_or()?;
        if !matches!(&self.peek().kind, TokenKind::End) {
            return Err(format!(
                "unexpected token at position {}",
                self.peek().position
            ));
        }
        Ok(expression)
    }

    fn peek(&self) -> &Token {
        &self.tokens[self.index]
    }

    fn advance(&mut self) -> Token {
        let token = self.tokens[self.index].clone();
        self.index += 1;
        token
    }

    fn consume(&mut self, expected: &TokenKind) -> bool {
        if std::mem::discriminant(&self.peek().kind) == std::mem::discriminant(expected) {
            self.index += 1;
            true
        } else {
            false
        }
    }

    fn parse_additive(&mut self) -> Result<Expression, String> {
        let mut left = self.parse_multiplicative()?;
        loop {
            let operator = if self.consume(&TokenKind::Plus) {
                Some(BinaryOperator::Add)
            } else if self.consume(&TokenKind::Minus) {
                Some(BinaryOperator::Subtract)
            } else {
                None
            };
            let Some(operator) = operator else {
                return Ok(left);
            };
            let right = self.parse_multiplicative()?;
            left = Expression::Binary {
                operator,
                left: Box::new(left),
                right: Box::new(right),
            };
        }
    }

    fn parse_comparison(&mut self) -> Result<Expression, String> {
        let mut left = self.parse_additive()?;
        loop {
            let operator = if self.consume(&TokenKind::Less) {
                Some(BinaryOperator::Less)
            } else if self.consume(&TokenKind::Greater) {
                Some(BinaryOperator::Greater)
            } else if self.consume(&TokenKind::LessOrEqual) {
                Some(BinaryOperator::LessOrEqual)
            } else if self.consume(&TokenKind::GreaterOrEqual) {
                Some(BinaryOperator::GreaterOrEqual)
            } else {
                None
            };
            let Some(operator) = operator else {
                return Ok(left);
            };
            let right = self.parse_additive()?;
            left = Expression::Binary {
                operator,
                left: Box::new(left),
                right: Box::new(right),
            };
        }
    }

    fn parse_equality(&mut self) -> Result<Expression, String> {
        let mut left = self.parse_comparison()?;
        loop {
            let operator = if self.consume(&TokenKind::Equal) {
                Some(BinaryOperator::Equal)
            } else if self.consume(&TokenKind::NotEqual) {
                Some(BinaryOperator::NotEqual)
            } else {
                None
            };
            let Some(operator) = operator else {
                return Ok(left);
            };
            let right = self.parse_comparison()?;
            left = Expression::Binary {
                operator,
                left: Box::new(left),
                right: Box::new(right),
            };
        }
    }

    fn parse_logical_and(&mut self) -> Result<Expression, String> {
        let mut left = self.parse_equality()?;
        while self.consume(&TokenKind::LogicalAnd) {
            left = Expression::Binary {
                operator: BinaryOperator::LogicalAnd,
                left: Box::new(left),
                right: Box::new(self.parse_equality()?),
            };
        }
        Ok(left)
    }

    fn parse_logical_or(&mut self) -> Result<Expression, String> {
        let mut left = self.parse_logical_and()?;
        while self.consume(&TokenKind::LogicalOr) {
            left = Expression::Binary {
                operator: BinaryOperator::LogicalOr,
                left: Box::new(left),
                right: Box::new(self.parse_logical_and()?),
            };
        }
        Ok(left)
    }

    fn parse_multiplicative(&mut self) -> Result<Expression, String> {
        let mut left = self.parse_unary()?;
        loop {
            let operator = if self.consume(&TokenKind::Star) {
                Some(BinaryOperator::Multiply)
            } else if self.consume(&TokenKind::Slash) {
                Some(BinaryOperator::Divide)
            } else if self.consume(&TokenKind::Percent) {
                Some(BinaryOperator::Remainder)
            } else {
                None
            };
            let Some(operator) = operator else {
                return Ok(left);
            };
            let right = self.parse_unary()?;
            left = Expression::Binary {
                operator,
                left: Box::new(left),
                right: Box::new(right),
            };
        }
    }

    fn parse_unary(&mut self) -> Result<Expression, String> {
        if self.consume(&TokenKind::Plus) {
            return Ok(Expression::Unary {
                operator: UnaryOperator::Plus,
                argument: Box::new(self.parse_unary()?),
            });
        }
        if self.consume(&TokenKind::Minus) {
            return Ok(Expression::Unary {
                operator: UnaryOperator::Minus,
                argument: Box::new(self.parse_unary()?),
            });
        }
        if self.consume(&TokenKind::Bang) {
            return Ok(Expression::Unary {
                operator: UnaryOperator::Not,
                argument: Box::new(self.parse_unary()?),
            });
        }
        self.parse_power()
    }

    fn parse_power(&mut self) -> Result<Expression, String> {
        let left = self.parse_postfix()?;
        if !self.consume(&TokenKind::Power) {
            return Ok(left);
        }
        let right = self.parse_unary()?;
        Ok(Expression::Binary {
            operator: BinaryOperator::Power,
            left: Box::new(left),
            right: Box::new(right),
        })
    }

    fn parse_postfix(&mut self) -> Result<Expression, String> {
        let mut expression = self.parse_primary()?;
        while self.consume(&TokenKind::LeftBracket) {
            let accessors = self.parse_accessors()?;
            expression = Expression::Access {
                target: Box::new(expression),
                accessors,
            };
        }
        Ok(expression)
    }

    fn parse_accessors(&mut self) -> Result<Vec<Accessor>, String> {
        if self.consume(&TokenKind::RightBracket) {
            return Err("empty tensor index".to_string());
        }
        let mut accessors = vec![self.parse_accessor()?];
        while self.consume(&TokenKind::Comma) {
            if matches!(&self.peek().kind, TokenKind::RightBracket) {
                return Err("empty tensor index after ','".to_string());
            }
            accessors.push(self.parse_accessor()?);
        }
        if !self.consume(&TokenKind::RightBracket) {
            return Err(format!("expected ']' at position {}", self.peek().position));
        }
        Ok(accessors)
    }

    fn parse_accessor(&mut self) -> Result<Accessor, String> {
        if self.consume(&TokenKind::Colon) {
            return self.parse_slice_tail(None);
        }
        let first = self.parse_logical_or()?;
        if !self.consume(&TokenKind::Colon) {
            return Ok(Accessor::Index(Box::new(first)));
        }
        self.parse_slice_tail(Some(Box::new(first)))
    }

    fn parse_slice_tail(&mut self, start: Option<Box<Expression>>) -> Result<Accessor, String> {
        let (end, step) = if self.consume(&TokenKind::Colon) {
            (None, self.parse_optional_slice_component()?)
        } else if self.at_accessor_end() {
            (None, None)
        } else {
            let end = Some(Box::new(self.parse_logical_or()?));
            let step = if self.consume(&TokenKind::Colon) {
                self.parse_optional_slice_component()?
            } else {
                None
            };
            (end, step)
        };
        Ok(Accessor::Slice { start, end, step })
    }

    fn parse_optional_slice_component(&mut self) -> Result<Option<Box<Expression>>, String> {
        if self.at_accessor_end() {
            Ok(None)
        } else {
            self.parse_logical_or().map(Box::new).map(Some)
        }
    }

    fn at_accessor_end(&self) -> bool {
        matches!(
            &self.peek().kind,
            TokenKind::Comma | TokenKind::RightBracket
        )
    }

    fn parse_primary(&mut self) -> Result<Expression, String> {
        let token = self.advance();
        match token.kind {
            TokenKind::Number(value) => Ok(Expression::Number(value)),
            TokenKind::Identifier(name) => {
                if !self.consume(&TokenKind::LeftParen) {
                    if name == "true" {
                        return Ok(Expression::Number(1.0));
                    }
                    if name == "false" {
                        return Ok(Expression::Number(0.0));
                    }
                    return Ok(Expression::Identifier(name));
                }
                let mut arguments = Vec::new();
                if !self.consume(&TokenKind::RightParen) {
                    arguments.push(self.parse_logical_or()?);
                    while self.consume(&TokenKind::Comma) {
                        arguments.push(self.parse_logical_or()?);
                    }
                    if !self.consume(&TokenKind::RightParen) {
                        return Err(format!("expected ')' at position {}", self.peek().position));
                    }
                }
                if name == "integral" {
                    if arguments.len() != 1 {
                        return Err("integral expects exactly 1 argument".to_string());
                    }
                    return Ok(Expression::Integral(Box::new(
                        arguments.pop().expect("one integral argument was checked"),
                    )));
                }
                Ok(Expression::Call { name, arguments })
            }
            TokenKind::LeftBracket => {
                if self.consume(&TokenKind::RightBracket) {
                    return Ok(Expression::Array(Vec::new()));
                }
                let mut elements = vec![self.parse_logical_or()?];
                while self.consume(&TokenKind::Comma) {
                    elements.push(self.parse_logical_or()?);
                }
                if !self.consume(&TokenKind::RightBracket) {
                    return Err(format!("expected ']' at position {}", self.peek().position));
                }
                Ok(Expression::Array(elements))
            }
            TokenKind::LeftParen => {
                let expression = self.parse_logical_or()?;
                if !self.consume(&TokenKind::RightParen) {
                    return Err(format!("expected ')' at position {}", self.peek().position));
                }
                Ok(expression)
            }
            TokenKind::End => Err("unexpected end of expression".to_string()),
            _ => Err(format!("unexpected token at position {}", token.position)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn evaluate(source: &str) -> f64 {
        let values = HashMap::new();
        let local_functions = HashMap::new();
        parse(source)
            .expect("expression should parse")
            .evaluate(&EvaluationContext {
                values: &values,
                time: 0.0,
                t0: 0.0,
                t1: 10.0,
                dt: 1.0,
                self_value: None,
                allow_integral: false,
                local_values: None,
                local_functions: &local_functions,
                local_function_stack: &[],
                random: None,
            })
            .expect("expression should evaluate")
            .as_scalar()
            .expect("expression should be scalar")
    }

    #[test]
    fn precedence_matches_stgraphx_for_signs_and_powers() {
        assert_eq!(evaluate("-2^2 + 2^3^2"), 508.0);
        assert_eq!(evaluate("2^-2"), 0.25);
    }

    #[test]
    fn scientific_notation_is_supported() {
        assert_eq!(evaluate("1.5e2 + .5"), 150.5);
    }

    #[test]
    fn comparisons_logic_and_scalar_conditionals_are_supported() {
        assert_eq!(evaluate("1 < 2 and not false"), 1.0);
        assert_eq!(evaluate("3 == 4 or 5 >= 5"), 1.0);
        assert_eq!(evaluate("if(1,42,unsupported())"), 42.0);
        assert_eq!(evaluate("-3 % 2"), 1.0);
    }

    #[test]
    fn references_are_collected_deterministically() {
        let expression = parse("beta + alpha * beta").expect("expression should parse");
        assert_eq!(
            expression.references().into_iter().collect::<Vec<_>>(),
            vec!["alpha".to_string(), "beta".to_string()]
        );
    }

    #[test]
    fn generated_array_indices_are_local_references() {
        let expression =
            parse("array(n,values[$0]+external+$i0)").expect("expression should parse");
        assert_eq!(
            expression.references().into_iter().collect::<Vec<_>>(),
            vec![
                "external".to_string(),
                "n".to_string(),
                "values".to_string(),
            ]
        );
    }

    #[test]
    fn generated_arrays_support_numeric_and_vector_axes() {
        let values = HashMap::new();
        let local_functions = HashMap::new();
        let evaluate_array = |source: &str| {
            parse(source)
                .expect("expression should parse")
                .evaluate(&EvaluationContext {
                    values: &values,
                    time: 0.0,
                    t0: 0.0,
                    t1: 1.0,
                    dt: 1.0,
                    self_value: None,
                    allow_integral: false,
                    local_values: None,
                    local_functions: &local_functions,
                    local_function_stack: &[],
                    random: None,
                })
                .expect("array should evaluate")
        };

        assert_eq!(
            evaluate_array("array(3,$0+$i0)"),
            Value::tensor(vec![3], vec![0.0, 2.0, 4.0]).expect("tensor should be valid")
        );
        assert_eq!(
            evaluate_array("array([2,4],$0+$i0)"),
            Value::tensor(vec![2], vec![2.0, 5.0]).expect("tensor should be valid")
        );
        assert_eq!(
            evaluate_array("array(2,[10,20],$0+$1+$i0+$i1)"),
            Value::tensor(vec![2, 2], vec![10.0, 21.0, 12.0, 23.0])
                .expect("tensor should be valid")
        );
    }

    #[test]
    fn state_context_and_euler_integral_are_supported() {
        let values = HashMap::from([("rate".to_string(), Value::scalar(2.0))]);
        let self_value = Value::scalar(3.0);
        let local_functions = HashMap::new();
        let expression = parse("integral(rate)+time+this").expect("expression should parse");
        let value = expression
            .evaluate(&EvaluationContext {
                values: &values,
                time: 0.5,
                t0: 0.0,
                t1: 1.0,
                dt: 0.25,
                self_value: Some(&self_value),
                allow_integral: true,
                local_values: None,
                local_functions: &local_functions,
                local_function_stack: &[],
                random: None,
            })
            .expect("state expression should evaluate");

        assert_eq!(value.as_scalar(), Some(7.0));
        assert!(expression.uses_integral());
        assert!(expression.uses_identifier("this"));
    }

    #[test]
    fn array_literals_and_broadcast_arithmetic_are_supported() {
        let values = HashMap::new();
        let local_functions = HashMap::new();
        let expression = parse("[1,2]*2+[[10,20],[30,40]]").expect("expression should parse");
        let error = expression
            .evaluate(&EvaluationContext {
                values: &values,
                time: 0.0,
                t0: 0.0,
                t1: 1.0,
                dt: 1.0,
                self_value: None,
                allow_integral: false,
                local_values: None,
                local_functions: &local_functions,
                local_function_stack: &[],
                random: None,
            })
            .expect_err("mismatched shapes should fail");

        assert_eq!(error, "operator arguments must have matching shapes");

        let vector = parse("[1,2]*2+10")
            .expect("expression should parse")
            .evaluate(&EvaluationContext {
                values: &values,
                time: 0.0,
                t0: 0.0,
                t1: 1.0,
                dt: 1.0,
                self_value: None,
                allow_integral: false,
                local_values: None,
                local_functions: &local_functions,
                local_function_stack: &[],
                random: None,
            })
            .expect("vector expression should evaluate");
        assert_eq!(
            vector
                .as_tensor()
                .expect("result should be a tensor")
                .elements(),
            &[12.0, 14.0]
        );
    }
}
