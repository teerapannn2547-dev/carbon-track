export const calculatePoints = (
  category: string,
  weight: number
) => {
  const base: Record<string, number> = {
    Plastic: 20,
    Paper: 10,
    Glass: 15,
    Metal: 25,
    Organic: 5,
  };

  return Math.round(
    (base[category] || 5) * weight
  );
};