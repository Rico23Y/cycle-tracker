export type TemperatureUnit = 'celsius' | 'fahrenheit';

export function celsiusToFahrenheit(celsius: number): number {
    return (celsius * 9) / 5 + 32;
}

export function fahrenheitToCelsius(fahrenheit: number): number {
    return ((fahrenheit - 32) * 5) / 9;
}

export function displayTemperatureValue(
    celsius: number | string | null | undefined,
    unit: TemperatureUnit,
): number | null {
    if (celsius === null || celsius === undefined || celsius === '') {
        return null;
    }

    const value = Number(celsius);

    if (Number.isNaN(value)) {
        return null;
    }

    if (unit === 'fahrenheit') {
        return celsiusToFahrenheit(value);
    }

    return value;
}

export function formatTemperature(
    celsius: number | string | null | undefined,
    unit: TemperatureUnit,
    decimals = 2,
): string {
    const value = displayTemperatureValue(celsius, unit);

    if (value === null) {
        return 'No reading';
    }

    return `${value.toFixed(decimals)}°${unit === 'fahrenheit' ? 'F' : 'C'}`;
}

export function normalizeTemperatureForStorage(
    value: string | number,
    unit: TemperatureUnit,
): number {
    const numericValue = Number(value);

    if (unit === 'fahrenheit') {
        return fahrenheitToCelsius(numericValue);
    }

    return numericValue;
}

export function temperatureUnitLabel(unit: TemperatureUnit): string {
    return unit === 'fahrenheit' ? '°F' : '°C';
}

export function temperatureInputValue(
    celsius: number | string | null | undefined,
    unit: TemperatureUnit,
    decimals = 2,
): string {
    const value = displayTemperatureValue(celsius, unit);

    if (value === null) {
        return '';
    }

    return value.toFixed(decimals);
}