import pick from "lodash/pick";

import { FormBlock } from "core/form/types";
import { AirbyteJSONSchemaDefinition, AirbyteJSONSchema } from "core/jsonSchema";
import { isDefined } from "utils/common";

import { FormBuildError } from "./FormBuildError";

/**
 * Returns {@link FormBlock} representation of jsonSchema
 *
 * Builds internal {@link FormBlock} from jsonSchema recursively.
 * Allows to walk through and validate schema in a more convenient way
 *
 * @param jsonSchema
 * @param key
 * @param path
 * @param parentSchema
 */
export const jsonSchemaToFormBlock = (
  jsonSchema: AirbyteJSONSchemaDefinition,
  key = "",
  path: string = key,
  parentSchema?: AirbyteJSONSchemaDefinition
): FormBlock => {
  const isRequired = isKeyRequired(key, parentSchema);

  // TODO: decide what to do with boolean case
  if (typeof jsonSchema === "boolean") {
    return {
      _type: "formItem",
      path: key,
      fieldKey: key,
      type: "null",
      isRequired,
      isSecret: false,
    };
  }

  if (jsonSchema.oneOf?.length && jsonSchema.oneOf.length > 0) {
    let possibleConditionSelectionKeys = null as Set<string> | null;
    const conditions = jsonSchema.oneOf.flatMap((condition) => {
      if (typeof condition === "boolean") {
        throw new FormBuildError("Spec uses oneOf without using object types for all conditions");
      }
      const formBlock = jsonSchemaToFormBlock({ ...condition, type: jsonSchema.type }, key, path);
      if (formBlock._type !== "formGroup") {
        return [];
      }

      const constProperties = new Set(
        formBlock.properties.filter((property) => property.const).map((property) => property.fieldKey)
      );
      if (!possibleConditionSelectionKeys) {
        // if this is the first condition, all const properties are candidates
        possibleConditionSelectionKeys = constProperties;
      } else {
        // if there are candidates already, intersect with the const properties of the current condition
        possibleConditionSelectionKeys = new Set(
          Array.from(possibleConditionSelectionKeys.values()).filter((x) => constProperties.has(x))
        );
      }
      return [formBlock];
    });

    if (!possibleConditionSelectionKeys || possibleConditionSelectionKeys.size === 0) {
      // no shared const property in oneOf. This should never happen per specification, fail hard
      throw new FormBuildError("Spec uses oneOf without a shared const property");
    }
    const selectionKey = possibleConditionSelectionKeys.values().next().value;
    const selectionPath = `${path}.${selectionKey}`;
    const selectionConstValues = conditions.map(
      (condition) => condition.properties.find((property) => property.path === selectionPath)?.const
    );

    return {
      ...pickDefaultFields(jsonSchema),
      _type: "formCondition",
      path: path || key,
      fieldKey: key,
      selectionPath,
      selectionKey,
      selectionConstValues,
      conditions,
      isRequired,
    };
  }

  if (
    jsonSchema.type === "array" &&
    typeof jsonSchema.items === "object" &&
    !Array.isArray(jsonSchema.items) &&
    jsonSchema.items.type === "object"
  ) {
    return {
      ...pickDefaultFields(jsonSchema),
      _type: "objectArray",
      path: path || key,
      fieldKey: key,
      properties: jsonSchemaToFormBlock(jsonSchema.items, key, path),
      isRequired,
    };
  }

  if (jsonSchema.type === "object") {
    const properties = Object.entries(jsonSchema.properties || []).map(([k, schema]) =>
      jsonSchemaToFormBlock(schema, k, path ? `${path}.${k}` : k, jsonSchema)
    );

    return {
      ...pickDefaultFields(jsonSchema),
      _type: "formGroup",
      path: path || key,
      fieldKey: key,
      properties,
      isRequired,
    };
  }

  return {
    ...pickDefaultFields(jsonSchema),
    _type: "formItem",
    path: path || key,
    fieldKey: key,
    isRequired,
    isSecret: !!jsonSchema.airbyte_secret,
    multiline: !!jsonSchema.multiline,
    format: jsonSchema.format,
    type: (Array.isArray(jsonSchema.type) ? jsonSchema.type[0] : jsonSchema.type) ?? "null",
  };
};

function isKeyRequired(key: string, parentSchema?: AirbyteJSONSchemaDefinition): boolean {
  const isRequired =
    (typeof parentSchema !== "boolean" &&
      Array.isArray(parentSchema?.required) &&
      parentSchema?.required.includes(key)) ||
    false;

  return isRequired;
}

const defaultFields = [
  "default",
  "examples",
  "description",
  "pattern",
  "order",
  "const",
  "title",
  "enum",

  // airbyte specific fields
  "airbyte_hidden",
] as const;

const pickDefaultFields = (schema: AirbyteJSONSchema) => {
  const partialSchema = pick(schema, defaultFields);

  if (typeof schema.items === "object" && !Array.isArray(schema.items) && schema.items.enum) {
    partialSchema.enum = schema.items.enum;
  } else if (schema.enum && schema.enum?.length === 1 && isDefined(schema.default)) {
    partialSchema.const = schema.default;
    // remove enum key as it has been "picked" already above
    delete partialSchema.enum;
  }

  return partialSchema;
};
