(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const controls = {
    count: $('qubitCount'), eve: $('eveToggle'), intercept: $('interceptRate'),
    noise: $('noiseRate'), sample: $('sampleRate')
  };
  const randomBytes = (length) => crypto.getRandomValues(new Uint8Array(length));
  const randomBit = () => randomBytes(1)[0] & 1;
  const randomBasis = () => randomBit(); // 0 = Z, 1 = X
  const randomFloat = () => randomBytes(4)[0] / 256;
  const setRangeOutput = (input, output, suffix = '%') => { $(output).value = `${input.value}${suffix}`; };
  const updateControls = () => {
    $('qubitCountOut').value = Number(controls.count.value).toLocaleString();
    setRangeOutput(controls.intercept, 'interceptRateOut');
    setRangeOutput(controls.noise, 'noiseRateOut');
    setRangeOutput(controls.sample, 'sampleRateOut');
    $('eveOptions').hidden = !controls.eve.checked;
    $('eveBadge').classList.toggle('active', controls.eve.checked);
  };
  [controls.count, controls.intercept, controls.noise, controls.sample].forEach(el => el.addEventListener('input', updateControls));
  controls.eve.addEventListener('change', updateControls);
  updateControls();

  function simulate() {
    const count = Number(controls.count.value);
    const intercept = controls.eve.checked ? Number(controls.intercept.value) / 100 : 0;
    const noise = Number(controls.noise.value) / 100;
    const sampleFraction = Number(controls.sample.value) / 100;
    const aliceBits = Array.from({length: count}, randomBit);
    const aliceBases = Array.from({length: count}, randomBasis);
    const bobBases = Array.from({length: count}, randomBasis);
    // Alice and Bob publicly compare bases after transmission and retain matches.
    const sifted = [];
    for (let i = 0; i < count; i++) {
      if (aliceBases[i] !== bobBases[i]) continue;
      const attacked = randomFloat() < intercept;
      let bobBit = aliceBits[i];
      if (attacked && randomBasis() !== aliceBases[i]) bobBit = randomBit();
      if (randomFloat() < noise) bobBit ^= 1;
      sifted.push({alice: aliceBits[i], bob: bobBit});
    }

    const sampleCount = sifted.length ? Math.max(1, Math.min(sifted.length, Math.floor(sifted.length * sampleFraction))) : 0;
    const indices = new Set();
    while (indices.size < sampleCount) indices.add(randomBytes(4).reduce((a, b) => a * 256 + b, 0) % sifted.length);
    let errors = 0;
    indices.forEach(i => { if (sifted[i].alice !== sifted[i].bob) errors++; });
    const qber = sampleCount ? errors / sampleCount : 1;
    const remaining = sifted.filter((_, i) => !indices.has(i));
    const passes = qber <= 0.11 && remaining.length > 0;
    const estimatedKeyLength = passes ? Math.max(0, Math.floor(remaining.length * (1 - 2 * binaryEntropy(qber)) - 32)) : 0;
    const finalKey = passes && estimatedKeyLength > 0 ? toeplitzHash(remaining.map(x => x.alice), estimatedKeyLength) : '';
    render({sifted, indices, sampleCount, errors, qber, remaining: remaining.length, passes, finalKey, estimatedKeyLength, count});
  }

  function binaryEntropy(p) {
    if (p <= 0 || p >= 1) return 0;
    return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
  }

  // Universal-2 Toeplitz hashing over GF(2): output bit i is the parity of
  // input[j] & seed[i + inputLength - 1 - j].
  function toeplitzHash(bits, outputLength) {
    const seedBits = Array.from({length: outputLength + bits.length - 1}, randomBit);
    const output = new Array(outputLength);
    for (let row = 0; row < outputLength; row++) {
      let parity = 0;
      for (let col = 0; col < bits.length; col++) parity ^= bits[col] & seedBits[row + bits.length - 1 - col];
      output[row] = parity;
    }
    return output.join('');
  }

  function render(result) {
    const {sifted, indices, sampleCount, errors, qber, remaining, passes, finalKey, estimatedKeyLength, count} = result;
    $('siftedMetric').innerHTML = `${sifted.length}<small> bits</small>`;
    $('siftedFoot').textContent = `${Math.round(sifted.length / count * 100)}% of transmitted qubits`;
    $('qberMetric').innerHTML = `${(qber * 100).toFixed(1)}<small>%</small>`;
    $('qberFoot').textContent = `${errors} error${errors === 1 ? '' : 's'} in ${sampleCount} revealed bits`;
    $('qberMark').className = `metric-mark ${passes ? '' : 'danger'}`;
    $('qberMark').textContent = passes ? '◎' : '⚠';
    $('statusMetric').className = `metric-status ${passes ? 'secure' : 'abort'}`;
    $('statusMetric').innerHTML = `<span class="status-dot"></span> ${passes ? 'CONTINUE' : 'ABORT'}`;
    $('statusFoot').textContent = passes ? 'QBER is within threshold' : 'QBER exceeds 11% threshold';
    $('thresholdFill').style.width = `${Math.min(qber * 4, 100)}%`;
    $('thresholdFill').style.background = passes ? 'var(--mint)' : 'var(--orange)';
    $('thresholdMessage').textContent = passes
      ? `Sample check passed. ${remaining} undisclosed bits remain before reconciliation and privacy amplification.`
      : 'The sample indicates too much disturbance. Alice and Bob should discard this key.';
    $('keyDisplay').textContent = finalKey ? formatKey(finalKey) : '— no key produced —';
    $('keyFoot').textContent = passes && finalKey
      ? `${estimatedKeyLength} bits after Toeplitz hashing · ${remaining} input bits · simplified asymptotic estimate`
      : 'Key is only produced when QBER passes and the estimated secure length is positive.';
    $('chartEnd').textContent = `BIT ${String(sifted.length).padStart(2, '0')}`;
    $('chartMid').textContent = `${sifted.length} SIFTED`;
    const chart = $('chartWrap');
    chart.innerHTML = '';
    const dots = document.createElement('div'); dots.className = 'dot-chart';
    sifted.forEach((bit, index) => {
      const dot = document.createElement('i'); dot.className = 'bit-dot';
      if (bit.alice !== bit.bob) dot.classList.add('error');
      if (indices.has(index)) dot.classList.add('sample');
      dot.title = `Sifted bit ${index + 1}: ${bit.alice === bit.bob ? 'no error' : 'error'}${indices.has(index) ? ', revealed sample' : ''}`;
      dots.appendChild(dot);
    });
    chart.appendChild(dots);
  }

  function formatKey(key) {
    return key.match(/.{1,8}/g).join(' ');
  }

  $('runButton').addEventListener('click', () => {
    const button = $('runButton');
    button.disabled = true; button.textContent = '◌  Simulating…';
    window.setTimeout(() => {
      simulate(); button.disabled = false;
      button.innerHTML = '<span>▶</span> Run again <span class="button-arrow">↗</span>';
      $('simulator').scrollIntoView({behavior: 'smooth', block: 'start'});
    }, 80);
  });
})();
