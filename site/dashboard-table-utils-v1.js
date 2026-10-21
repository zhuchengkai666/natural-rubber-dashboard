export function compactTableDisplayNote(note) {
  const fragments = String(note || "").match(/[^；;。]+[；;。]?/g) || [];
  return fragments
    .map((fragment) => fragment.trim())
    .filter(Boolean)
    .filter((fragment) => {
      if (/[=＝]/.test(fragment) || /(?:计算)?公式/.test(fragment)) return false;
      if (/合计为.+之和/.test(fragment)) return false;
      return !/(?:乳胶|半钢胎|全钢胎|乘用车轮胎|客货车轮胎).*?按\s*\d+(?:\.\d+)?(?:\s*kg\s*\/\s*条)?.*?(?:折干|耗胶系数)/i.test(fragment);
    })
    .join("")
    .replace(/[；;]+\s*$/, "。")
    .trim();
}

export function compactTableUnitLabel(tables) {
  const units = [];
  const add = (unit) => {
    if (unit && !units.includes(unit)) units.push(unit);
  };
  (tables || []).forEach((table) => {
    const unit = String(table?.unit || "").trim();
    if (/万吨/.test(unit)) add("万吨");
    if (/条/.test(unit)) add("条");
    if (unit && !/万吨|条/.test(unit)) add(unit);
  });
  return units.join(" / ");
}
