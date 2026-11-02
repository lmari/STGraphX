// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at https://mozilla.org/MPL/2.0/.
// Copyright (c) 2026 Luca Mari

use std::collections::{BTreeSet, HashMap};

#[derive(Debug, Clone, PartialEq)]
pub(crate) enum Expression {
    Number(f64),
    Identifier(String),
    Integral(Box<Expression>),
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

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum UnaryOperator {
    Plus,
    Minus,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum BinaryOperator {
    Add,
    Subtract,
    Multiply,
    Divide,
    Remainder,
    Power,
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
            Self::Integral(argument) => argument.collect_references(references),
            Self::Unary { argument, .. } => argument.collect_references(references),
            Self::Binary { left, right, .. } => {
                left.collect_references(references);
                right.collect_references(references);
            }
        }
    }

    pub(crate) fn uses_integral(&self) -> bool {
        match self {
            Self::Integral(_) => true,
            Self::Unary { argument, .. } => argument.uses_integral(),
            Self::Binary { left, right, .. } => left.uses_integral() || right.uses_integral(),
            Self::Number(_) | Self::Identifier(_) => false,
        }
    }

    pub(crate) fn uses_identifier(&self, expected: &str) -> bool {
        match self {
            Self::Identifier(name) => name == expected,
            Self::Integral(argument) | Self::Unary { argument, .. } => {
                argument.uses_identifier(expected)
            }
            Self::Binary { left, right, .. } => {
                left.uses_identifier(expected) || right.uses_identifier(expected)
            }
            Self::Number(_) => false,
        }
    }

    pub(crate) fn evaluate(&self, context: &EvaluationContext<'_>) -> Result<f64, String> {
        match self {
            Self::Number(value) => Ok(*value),
            Self::Identifier(name) => match name.as_str() {
                "time" => Ok(context.time),
                "t0" => Ok(context.t0),
                "t1" => Ok(context.t1),
                "dt" => Ok(context.dt),
                "this" => context
                    .self_value
                    .ok_or_else(|| "'this' is only available in state transitions".to_string()),
                _ => context
                    .values
                    .get(name)
                    .copied()
                    .ok_or_else(|| format!("'{name}' has no computed value")),
            },
            Self::Integral(argument) => {
                if !context.allow_integral {
                    return Err("'integral' is only available in state transitions".to_string());
                }
                let current = context.self_value.ok_or_else(|| {
                    "'integral' requires the current value of a state node".to_string()
                })?;
                Ok(current + argument.evaluate(context)? * context.dt)
            }
            Self::Unary { operator, argument } => {
                let value = argument.evaluate(context)?;
                Ok(match operator {
                    UnaryOperator::Plus => value,
                    UnaryOperator::Minus => -value,
                })
            }
            Self::Binary {
                operator,
                left,
                right,
            } => {
                let left = left.evaluate(context)?;
                let right = right.evaluate(context)?;
                Ok(match operator {
                    BinaryOperator::Add => left + right,
                    BinaryOperator::Subtract => left - right,
                    BinaryOperator::Multiply => left * right,
                    BinaryOperator::Divide => left / right,
                    BinaryOperator::Remainder => left % right,
                    BinaryOperator::Power => left.powf(right),
                })
            }
        }
    }
}

pub(crate) struct EvaluationContext<'a> {
    pub(crate) values: &'a HashMap<String, f64>,
    pub(crate) time: f64,
    pub(crate) t0: f64,
    pub(crate) t1: f64,
    pub(crate) dt: f64,
    pub(crate) self_value: Option<f64>,
    pub(crate) allow_integral: bool,
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
                TokenKind::Identifier(source[start..index].to_string())
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
        let expression = self.parse_additive()?;
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
        self.parse_power()
    }

    fn parse_power(&mut self) -> Result<Expression, String> {
        let left = self.parse_primary()?;
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

    fn parse_primary(&mut self) -> Result<Expression, String> {
        let token = self.advance();
        match token.kind {
            TokenKind::Number(value) => Ok(Expression::Number(value)),
            TokenKind::Identifier(name) => {
                if !self.consume(&TokenKind::LeftParen) {
                    return Ok(Expression::Identifier(name));
                }
                if name != "integral" {
                    return Err(format!(
                        "unsupported function '{name}' at position {}",
                        token.position
                    ));
                }
                let argument = self.parse_additive()?;
                if !self.consume(&TokenKind::RightParen) {
                    return Err(format!("expected ')' at position {}", self.peek().position));
                }
                Ok(Expression::Integral(Box::new(argument)))
            }
            TokenKind::LeftParen => {
                let expression = self.parse_additive()?;
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
            })
            .expect("expression should evaluate")
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
    fn references_are_collected_deterministically() {
        let expression = parse("beta + alpha * beta").expect("expression should parse");
        assert_eq!(
            expression.references().into_iter().collect::<Vec<_>>(),
            vec!["alpha".to_string(), "beta".to_string()]
        );
    }

    #[test]
    fn state_context_and_euler_integral_are_supported() {
        let values = HashMap::from([("rate".to_string(), 2.0)]);
        let expression = parse("integral(rate)+time+this").expect("expression should parse");
        let value = expression
            .evaluate(&EvaluationContext {
                values: &values,
                time: 0.5,
                t0: 0.0,
                t1: 1.0,
                dt: 0.25,
                self_value: Some(3.0),
                allow_integral: true,
            })
            .expect("state expression should evaluate");

        assert_eq!(value, 7.0);
        assert!(expression.uses_integral());
        assert!(expression.uses_identifier("this"));
    }
}
