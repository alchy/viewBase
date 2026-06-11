/** Výsledný styl uzlu – čistá funkce, priorita: meta > typ > téma.
 *  `types` je store.nodeTypes (dict z define_type), `theme` aktivní téma.
 *  Klíč `model` (GLB) se v Plánu 2b ignoruje – tvar spadne na default. */
export function nodeStyle(node, types, theme) {
  const type = (node.type != null && types[node.type]) || {};
  return {
    shape: type.shape ?? theme.node.shape,
    color: node.meta.color ?? type.color ?? theme.node.color,
    size: node.meta.size ?? type.size ?? theme.node.size,
  };
}
