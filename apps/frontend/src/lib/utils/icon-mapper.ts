/**
 * Icon Mapper Utility
 * Automatically generates appropriate icons for custom payment services based on their titles
 */

/**
 * Maps service title keywords to appropriate icon names
 * Returns the icon name that best represents the service
 */
export function getIconForServiceTitle(title: string): string {
  if (!title) return 'FileText';

  const normalizedTitle = title.toLowerCase().trim();

  // Business & Permits
  if (
    normalizedTitle.includes('business') ||
    normalizedTitle.includes('permit') ||
    normalizedTitle.includes('license') ||
    normalizedTitle.includes('registration') ||
    normalizedTitle.includes('certificate')
  ) {
    return 'Store';
  }

  // Building & Construction
  if (
    normalizedTitle.includes('building') ||
    normalizedTitle.includes('construction') ||
    normalizedTitle.includes('renovation') ||
    normalizedTitle.includes('structure')
  ) {
    return 'Building';
  }

  // Property & Land
  if (
    normalizedTitle.includes('property') ||
    normalizedTitle.includes('land') ||
    normalizedTitle.includes('real estate') ||
    normalizedTitle.includes('lot') ||
    normalizedTitle.includes('parcel')
  ) {
    return 'LandPlot';
  }

  // Transportation & Vehicles
  if (
    normalizedTitle.includes('vehicle') ||
    normalizedTitle.includes('transport') ||
    normalizedTitle.includes('truck') ||
    normalizedTitle.includes('car') ||
    normalizedTitle.includes('motorcycle') ||
    normalizedTitle.includes('delivery')
  ) {
    return 'Truck';
  }

  // Payments & Fees
  if (
    normalizedTitle.includes('payment') ||
    normalizedTitle.includes('fee') ||
    normalizedTitle.includes('charge') ||
    normalizedTitle.includes('bill') ||
    normalizedTitle.includes('invoice')
  ) {
    return 'HandCoins';
  }

  // Receipts & Transactions
  if (
    normalizedTitle.includes('receipt') ||
    normalizedTitle.includes('transaction') ||
    normalizedTitle.includes('record')
  ) {
    return 'Receipt';
  }

  // Shopping & Purchases
  if (
    normalizedTitle.includes('purchase') ||
    normalizedTitle.includes('shopping') ||
    normalizedTitle.includes('buy') ||
    normalizedTitle.includes('order')
  ) {
    return 'ShoppingCart';
  }

  // Applications & Forms
  if (
    normalizedTitle.includes('application') ||
    normalizedTitle.includes('form') ||
    normalizedTitle.includes('request') ||
    normalizedTitle.includes('submission')
  ) {
    return 'FileText';
  }

  // Health & Medical
  if (
    normalizedTitle.includes('health') ||
    normalizedTitle.includes('medical') ||
    normalizedTitle.includes('hospital') ||
    normalizedTitle.includes('clinic')
  ) {
    return 'Building2';
  }

  // Education
  if (
    normalizedTitle.includes('education') ||
    normalizedTitle.includes('school') ||
    normalizedTitle.includes('student') ||
    normalizedTitle.includes('tuition')
  ) {
    return 'Building2';
  }

  // Utilities
  if (
    normalizedTitle.includes('utility') ||
    normalizedTitle.includes('water') ||
    normalizedTitle.includes('electric') ||
    normalizedTitle.includes('power')
  ) {
    return 'Building';
  }

  // Tax & Revenue
  if (
    normalizedTitle.includes('tax') ||
    normalizedTitle.includes('revenue') ||
    normalizedTitle.includes('assessment')
  ) {
    return 'Receipt';
  }

  // Default fallback
  return 'FileText';
}

/**
 * Maps icon name to color class for consistent styling
 */
export function getColorForIcon(iconName: string): string {
  const colorMap: Record<string, string> = {
    Store: 'bg-blue-500',
    Building: 'bg-indigo-500',
    Building2: 'bg-purple-500',
    LandPlot: 'bg-green-500',
    Truck: 'bg-orange-500',
    HandCoins: 'bg-yellow-500',
    Receipt: 'bg-red-500',
    ShoppingCart: 'bg-pink-500',
    FileText: 'bg-gray-500',
  };

  return colorMap[iconName] || 'bg-indigo-500';
}
