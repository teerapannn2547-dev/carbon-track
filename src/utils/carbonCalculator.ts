export const calculateCarbon = (
  category: string,
  weight: number
) => {
  const factor: Record<string, number> = {
    Plastic: 6,
    Paper: 3,
    Glass: 2,
    Metal: 5,
    Organic: 1,
  };

  return (
    (factor[category] || 1) * weight
  );
};