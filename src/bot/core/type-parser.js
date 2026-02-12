/**
 * Type Parser
 * 
 * Parses and validates argument types based on types.json definitions
 */

// Static import for types definition
import typesDefinition from '../definitions/types.json' with { type: 'json' };

export class TypeParser {
    constructor() {
        this.types = typesDefinition || {};
        this.listDelimiter = this.types.list?.delimiter || ',';
        this.unionDelimiter = this.types.unionType?.delimiter || '|';
    }

    /**
     * Parse a value according to its type definition
     * @param {string} value - Raw string value
     * @param {string} type - Type name (e.g., 'int', 'bool', 'UserId')
     * @param {object} paramDef - Parameter definition with optional flags
     * @returns {{ success: boolean, value: any, error?: string }}
     */
    parse(value, type, paramDef = {}) {
        // Handle null/undefined
        if (value === null || value === undefined) {
            if (paramDef.optional) {
                return { success: true, value: paramDef.default ?? null };
            }
            return { success: false, error: 'Value is required' };
        }

        // Handle list types
        if (paramDef.isList) {
            return this.parseList(value, type, paramDef);
        }

        // Handle union types (e.g., 'GroupId|UserId' or 'Service|*')
        if (type.includes('|')) {
            return this.parseUnion(value, type, paramDef);
        }

        // Handle base types
        return this.parseBaseType(value, type);
    }

    /**
     * Parse a list of values
     */
    parseList(value, type, paramDef) {
        const items = this.splitList(String(value));
        const results = [];

        for (const item of items) {
            const trimmed = item.trim();
            if (!trimmed) continue;

            const parsed = this.parse(trimmed, type, { ...paramDef, isList: false });
            if (!parsed.success) {
                return { success: false, error: `Invalid list item: ${parsed.error}` };
            }
            results.push(parsed.value);
        }

        // Check min/max constraints
        const min = paramDef.min ?? this.types.list?.min ?? 0;
        const max = paramDef.max ?? this.types.list?.max ?? null;

        if (results.length < min) {
            return { success: false, error: `List must have at least ${min} items` };
        }
        if (max !== null && results.length > max) {
            return { success: false, error: `List must have at most ${max} items` };
        }

        return { success: true, value: results };
    }

    /**
     * Split a list string respecting escape characters
     */
    splitList(value) {
        const delimiter = this.listDelimiter;
        const items = [];
        let current = '';
        let escaped = false;

        for (const char of value) {
            if (escaped) {
                current += char;
                escaped = false;
            } else if (char === '\\') {
                escaped = true;
            } else if (char === delimiter) {
                items.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        items.push(current);
        return items;
    }

    /**
     * Parse a union type (e.g., 'GroupId|UserId|*')
     */
    parseUnion(value, type, paramDef) {
        const types = type.split(this.unionDelimiter);

        // Try each type in order
        for (const t of types) {
            const trimmed = t.trim();

            // Special handling for wildcard
            if (trimmed === '*' && value === '*') {
                return { success: true, value: '*' };
            }

            const parsed = this.parseBaseType(value, trimmed);
            if (parsed.success) {
                return parsed;
            }
        }

        return { success: false, error: `Value must be one of: ${types.join(' or ')}` };
    }

    /**
     * Parse a base type
     */
    parseBaseType(value, type) {
        const strValue = String(value).trim();

        // Check if type is derived from another type
        const typeDef = this.types[type];
        if (typeDef?.derivedFrom) {
            // First validate against derived type
            const baseResult = this.parseBaseType(strValue, typeDef.derivedFrom);
            if (!baseResult.success) {
                return baseResult;
            }
            // Then apply additional validation for the specific type
            return this.validateDerivedType(strValue, type, typeDef);
        }

        switch (type) {
            case 'int':
                return this.parseInt(strValue);
            case 'float':
                return this.parseFloat(strValue);
            case 'bool':
                return this.parseBool(strValue);
            case 'word':
                return this.parseWord(strValue);
            case 'string':
                return { success: true, value: strValue };
            case 'date':
                return this.parseDate(strValue);
            case 'time':
                return this.parseTime(strValue);
            case 'datetime':
                return this.parseDateTime(strValue);
            case 'email':
                return this.parseEmail(strValue);
            case 'any':
                return { success: true, value: strValue };
            case '*':
                return { success: true, value: strValue };
            default:
                // Unknown type - treat as string
                return { success: true, value: strValue };
        }
    }

    /**
     * Validate derived types with additional constraints
     */
    validateDerivedType(value, type, typeDef) {
        switch (type) {
            case 'GroupId':
                if (!value.endsWith('@g.us')) {
                    return { success: false, error: 'GroupId must end with @g.us' };
                }
                return { success: true, value };

            case 'UserId':
                if (!value.endsWith('@s.whatsapp.net')) {
                    return { success: false, error: 'UserId must end with @s.whatsapp.net' };
                }
                return { success: true, value };

            case 'Role':
            case 'Service':
            case 'Command':
            case 'Setting':
                // These are derived from 'word' - just ensure it's a valid word
                return this.parseWord(value);

            case 'Arguments':
                // Free-form string
                return { success: true, value };

            default:
                return { success: true, value };
        }
    }

    parseInt(value) {
        const num = Number(value);
        if (isNaN(num) || !Number.isInteger(num)) {
            return { success: false, error: 'Must be an integer' };
        }
        return { success: true, value: num };
    }

    parseFloat(value) {
        const num = Number(value);
        if (isNaN(num)) {
            return { success: false, error: 'Must be a number' };
        }
        return { success: true, value: num };
    }

    parseBool(value) {
        const lower = value.toLowerCase();
        const trueValues = ['true', 'yes', 'on', '1'];
        const falseValues = ['false', 'no', 'off', '0'];

        if (trueValues.includes(lower)) {
            return { success: true, value: true };
        }
        if (falseValues.includes(lower)) {
            return { success: true, value: false };
        }
        return { success: false, error: 'Must be a boolean (true/false, yes/no, on/off, 1/0)' };
    }

    parseWord(value) {
        if (/\s/.test(value)) {
            return { success: false, error: 'Must be a single word without spaces' };
        }
        return { success: true, value };
    }

    parseDate(value) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(value)) {
            return { success: false, error: 'Must be a date in YYYY-MM-DD format' };
        }
        const date = new Date(value);
        if (isNaN(date.getTime())) {
            return { success: false, error: 'Invalid date' };
        }
        return { success: true, value };
    }

    parseTime(value) {
        const timeRegex = /^\d{2}:\d{2}(:\d{2})?$/;
        if (!timeRegex.test(value)) {
            return { success: false, error: 'Must be a time in HH:MM or HH:MM:SS format' };
        }
        return { success: true, value };
    }

    parseDateTime(value) {
        const dtRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;
        if (!dtRegex.test(value)) {
            return { success: false, error: 'Must be a datetime in ISO 8601 format (YYYY-MM-DDTHH:MM)' };
        }
        const date = new Date(value);
        if (isNaN(date.getTime())) {
            return { success: false, error: 'Invalid datetime' };
        }
        return { success: true, value };
    }

    parseEmail(value) {
        // Basic email regex - also accepts WhatsApp IDs like user@s.whatsapp.net
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            return { success: false, error: 'Must be a valid email/ID format' };
        }
        return { success: true, value };
    }

    /**
     * Get type info for display purposes
     */
    getTypeInfo(type) {
        const typeDef = this.types[type];
        if (typeDef) {
            return {
                description: typeDef.description,
                examples: typeDef.examples || []
            };
        }
        return { description: type, examples: [] };
    }
}

export default TypeParser;
