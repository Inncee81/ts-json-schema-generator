import { JSONSchema7Definition } from "json-schema";
import { Definition } from "./../Schema/Definition";
import { StringMap } from "./StringMap";

function addReachable(
    definition: Definition | JSONSchema7Definition,
    definitions: StringMap<Definition>,
    reachable: Set<string>,
    empties: Set<string>
) {
    if (typeof definition === "boolean" || Object.keys(definition).length === 0) {
        return;
    }

    if (definition?.$ref) {
        const $ref = decodeURIComponent(definition.$ref);
        if (reachable.has($ref)) {
            // we've already processed this definition
            return;
        }
        if (empties.has($ref) || isEmpty($ref, definitions)) {
            delete definition.$ref;
            empties.add($ref);
        } else {
            reachable.add($ref);
            addReachable(definitions[$ref.slice(14)], definitions, reachable, empties);
        }
    } else if (definition.anyOf) {
        for (const def of definition.anyOf) {
            if (Object.keys(def).length > 0) {
                addReachable(def, definitions, reachable, empties);
            }
        }
    } else if (definition.allOf) {
        for (const def of definition.allOf) {
            if (Object.keys(def).length > 0) {
                addReachable(def, definitions, reachable, empties);
            }
        }
    } else if (definition.oneOf) {
        for (const def of definition.oneOf) {
            if (Object.keys(def).length > 0) {
                addReachable(def, definitions, reachable, empties);
            }
        }
    } else if (definition.not) {
        addReachable(definition.not, definitions, reachable, empties);
    } else if (definition.type === "object") {
        for (const prop in definition.properties || {}) {
            const propDefinition = definition.properties![prop];
            if (Object.keys(propDefinition).length > 0) {
                addReachable(propDefinition, definitions, reachable, empties);
            }
        }
        const additionalProperties = definition.additionalProperties;
        if (additionalProperties) {
            if (Object.keys(additionalProperties).length > 0) {
                addReachable(additionalProperties, definitions, reachable, empties);
            }
        }
    } else if (definition.type === "array") {
        const items = definition.items;
        if (Array.isArray(items)) {
            for (const item of items) {
                if (Object.keys(item).length > 0) {
                    addReachable(item, definitions, reachable, empties);
                }
            }
        } else if (items) {
            if (Object.keys(items).length > 0) {
                addReachable(items, definitions, reachable, empties);
            }
        }
        const additionalItems = definition.additionalItems;
        if (additionalItems) {
            if (Object.keys(additionalItems).length > 0) {
                addReachable(additionalItems, definitions, reachable, empties);
            }
        }
    }
}

function isEmpty(ref: string, definitions: StringMap<Definition>): boolean {
    // const target = definitions[decodeURIComponent(ref).slice(14)];
    // if (target === null || target === undefined) {
    //     return true;
    // } else {
    //     const targetPropCount = Object.keys({ ...target }).length;
    //     if (targetPropCount === 0) {
    //         return true;
    //     } else if (target?.$ref) {
    //         if (isEmpty(target.$ref!, definitions) && targetPropCount === 1) {
    //             return true;
    //         }
    //     }
    // }
    return false;
}

export function removeUnreachable(
    rootTypeDefinition: Definition | undefined,
    definitions: StringMap<Definition>
): StringMap<Definition> {
    if (!rootTypeDefinition) {
        return definitions;
    }

    const reachable = new Set<string>();
    const empties = new Set<string>();

    addReachable(rootTypeDefinition, definitions, reachable, empties);

    const out: StringMap<Definition> = {};

    for (const def of reachable) {
        const key = decodeURIComponent(def).slice(14);
        out[key] = definitions[key];
    }

    return out;
}
