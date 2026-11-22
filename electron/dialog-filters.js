/* SPDX-License-Identifier: MPL-2.0 */
function dialogFilters(options = {}) {
  const filters = (options.types || []).map((type) => ({
    name: String(type.description || 'Files'),
    extensions: [...new Set(Object.values(type.accept || {}).flat()
      .map((extension) => String(extension).replace(/^\./, ''))
      .filter((extension) => /^[a-zA-Z0-9]+$/.test(extension)))],
  })).filter((filter) => filter.extensions.length);
  return filters.length ? filters : [{ name: 'JSON', extensions: ['json'] }];
}
module.exports = { dialogFilters };
