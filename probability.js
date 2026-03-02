(function attachGraphProbability(global) {
  function toFiniteNumber(value, label) {
    const out = Number(value);
    if (!Number.isFinite(out)) {
      throw new Error(`${label || "value"} must be finite`);
    }
    return out;
  }

  function erfApprox(x) {
    const sign = x < 0 ? -1 : 1;
    const ax = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * ax);
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);
    return sign * y;
  }

  function inverseStandardNormal(p) {
    const prob = toFiniteNumber(p, "probability");
    if (prob <= 0 || prob >= 1) {
      throw new Error("probability must be in (0, 1)");
    }

    const a = [
      -3.969683028665376e+01,
      2.209460984245205e+02,
      -2.759285104469687e+02,
      1.38357751867269e+02,
      -3.066479806614716e+01,
      2.506628277459239e+00,
    ];
    const b = [
      -5.447609879822406e+01,
      1.615858368580409e+02,
      -1.556989798598866e+02,
      6.680131188771972e+01,
      -1.328068155288572e+01,
    ];
    const c = [
      -7.784894002430293e-03,
      -3.223964580411365e-01,
      -2.400758277161838e+00,
      -2.549732539343734e+00,
      4.374664141464968e+00,
      2.938163982698783e+00,
    ];
    const d = [
      7.784695709041462e-03,
      3.224671290700398e-01,
      2.445134137142996e+00,
      3.754408661907416e+00,
    ];
    const plow = 0.02425;
    const phigh = 1 - plow;
    let q;
    let r;

    if (prob < plow) {
      q = Math.sqrt(-2 * Math.log(prob));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }

    if (prob > phigh) {
      q = Math.sqrt(-2 * Math.log(1 - prob));
      return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }

    q = prob - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }

  function parseDistributionCallArgs(argsLike, defaultParams) {
    const args = Array.from(argsLike);
    let params = defaultParams.slice();
    let valueArg;
    let modeArg = 0;

    if (Array.isArray(args[0])) {
      params = defaultParams.map((def, idx) => (
        args[0][idx] === undefined ? def : args[0][idx]
      ));
      valueArg = args[1];
      modeArg = args.length >= 3 ? args[2] : 0;
    } else {
      valueArg = args[0];
      modeArg = args.length >= 2 ? args[1] : 0;
    }

    const mode = Number(modeArg ?? 0);
    if (!Number.isFinite(mode) || ![0, 1, 2].includes(mode)) {
      throw new Error("mode must be 0 (pdf), 1 (cdf), or 2 (icdf)");
    }
    return { params, valueArg, mode };
  }

  function gaussianPdf(x, mean, sigma) {
    const xv = toFiniteNumber(x, "x");
    const mu = toFiniteNumber(mean, "mean");
    const sd = toFiniteNumber(sigma, "sigma");
    if (sd <= 0) {
      throw new Error("sigma must be > 0");
    }
    const z = (xv - mu) / sd;
    return Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI));
  }

  function gaussianCdf(x, mean, sigma) {
    const xv = toFiniteNumber(x, "x");
    const mu = toFiniteNumber(mean, "mean");
    const sd = toFiniteNumber(sigma, "sigma");
    if (sd <= 0) {
      throw new Error("sigma must be > 0");
    }
    const z = (xv - mu) / (sd * Math.sqrt(2));
    return 0.5 * (1 + erfApprox(z));
  }

  function gaussianIcdf(p, mean, sigma) {
    const mu = toFiniteNumber(mean, "mean");
    const sd = toFiniteNumber(sigma, "sigma");
    if (sd <= 0) {
      throw new Error("sigma must be > 0");
    }
    return mu + sd * inverseStandardNormal(p);
  }

  function gaussianSample(mean = 0, sigma = 1) {
    const mu = toFiniteNumber(mean, "mean");
    const sd = toFiniteNumber(sigma, "sigma");
    if (sd <= 0) {
      throw new Error("sigma must be > 0");
    }
    let u1 = 0;
    let u2 = 0;
    while (u1 <= Number.EPSILON) {
      u1 = Math.random();
    }
    u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mu + sd * z;
  }

  function gaussian() {
    const { params, valueArg, mode } = parseDistributionCallArgs(arguments, [0, 1]);
    const [mean, sigma] = params;
    if (valueArg === undefined) {
      return gaussianSample(mean, sigma);
    }
    if (mode === 1) {
      return gaussianCdf(valueArg, mean, sigma);
    }
    if (mode === 2) {
      return gaussianIcdf(valueArg, mean, sigma);
    }
    return gaussianPdf(valueArg, mean, sigma);
  }

  function uniformPdf(x, minValue, maxValue) {
    const xv = toFiniteNumber(x, "x");
    const lo = toFiniteNumber(minValue, "min");
    const hi = toFiniteNumber(maxValue, "max");
    if (hi <= lo) {
      throw new Error("max must be > min");
    }
    return xv < lo || xv > hi ? 0 : 1 / (hi - lo);
  }

  function uniformCdf(x, minValue, maxValue) {
    const xv = toFiniteNumber(x, "x");
    const lo = toFiniteNumber(minValue, "min");
    const hi = toFiniteNumber(maxValue, "max");
    if (hi <= lo) {
      throw new Error("max must be > min");
    }
    if (xv <= lo) {
      return 0;
    }
    if (xv >= hi) {
      return 1;
    }
    return (xv - lo) / (hi - lo);
  }

  function uniformIcdf(p, minValue, maxValue) {
    const prob = toFiniteNumber(p, "probability");
    const lo = toFiniteNumber(minValue, "min");
    const hi = toFiniteNumber(maxValue, "max");
    if (hi <= lo) {
      throw new Error("max must be > min");
    }
    if (prob < 0 || prob > 1) {
      throw new Error("probability must be in [0, 1]");
    }
    return lo + prob * (hi - lo);
  }

  function uniformSample(minValue = 0, maxValue = 1) {
    const lo = toFiniteNumber(minValue, "min");
    const hi = toFiniteNumber(maxValue, "max");
    if (hi <= lo) {
      throw new Error("max must be > min");
    }
    return lo + Math.random() * (hi - lo);
  }

  function uniform() {
    const { params, valueArg, mode } = parseDistributionCallArgs(arguments, [0, 1]);
    const [minValue, maxValue] = params;
    if (valueArg === undefined) {
      return uniformSample(minValue, maxValue);
    }
    if (mode === 1) {
      return uniformCdf(valueArg, minValue, maxValue);
    }
    if (mode === 2) {
      return uniformIcdf(valueArg, minValue, maxValue);
    }
    return uniformPdf(valueArg, minValue, maxValue);
  }

  function exponentialPdf(x, rate) {
    const xv = toFiniteNumber(x, "x");
    const lambda = toFiniteNumber(rate, "rate");
    if (lambda <= 0) {
      throw new Error("rate must be > 0");
    }
    if (xv < 0) {
      return 0;
    }
    return lambda * Math.exp(-lambda * xv);
  }

  function exponentialCdf(x, rate) {
    const xv = toFiniteNumber(x, "x");
    const lambda = toFiniteNumber(rate, "rate");
    if (lambda <= 0) {
      throw new Error("rate must be > 0");
    }
    if (xv <= 0) {
      return 0;
    }
    return 1 - Math.exp(-lambda * xv);
  }

  function exponentialIcdf(p, rate) {
    const prob = toFiniteNumber(p, "probability");
    const lambda = toFiniteNumber(rate, "rate");
    if (lambda <= 0) {
      throw new Error("rate must be > 0");
    }
    if (prob < 0 || prob >= 1) {
      throw new Error("probability must be in [0, 1)");
    }
    return -Math.log(1 - prob) / lambda;
  }

  function exponentialSample(rate = 1) {
    const lambda = toFiniteNumber(rate, "rate");
    if (lambda <= 0) {
      throw new Error("rate must be > 0");
    }
    let u = 0;
    while (u <= Number.EPSILON) {
      u = Math.random();
    }
    return -Math.log(u) / lambda;
  }

  function exponential() {
    const { params, valueArg, mode } = parseDistributionCallArgs(arguments, [1]);
    const [rate] = params;
    if (valueArg === undefined) {
      return exponentialSample(rate);
    }
    if (mode === 1) {
      return exponentialCdf(valueArg, rate);
    }
    if (mode === 2) {
      return exponentialIcdf(valueArg, rate);
    }
    return exponentialPdf(valueArg, rate);
  }

  global.GraphProbability = Object.freeze({
    gaussian,
    uniform,
    exponential,
  });
}(window));
