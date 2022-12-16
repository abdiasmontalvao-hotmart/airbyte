import { JSONSchema7, JSONSchema7Definition } from "json-schema";
import { useMemo } from "react";
import { useIntl } from "react-intl";
import { AnySchema } from "yup";

import { ConnectorDefinitionSpecification } from "core/domain/connector";
import { FormBuildError } from "core/form/FormBuildError";
import { jsonSchemaToFormBlock } from "core/form/schemaToFormBlock";
import { buildYupFormForJsonSchema } from "core/form/schemaToYup";
import { FormBlock, FormGroupItem } from "core/form/types";

import { ConnectorFormValues } from "./types";

export interface BuildFormHook {
  initialValues: ConnectorFormValues;
  formFields: FormBlock;
  jsonSchema: JSONSchema7;
}

function setDefaultValues(formGroup: FormGroupItem, values: Record<string, unknown>) {
  formGroup.properties.forEach((property) => {
    if (property.const) {
      values[property.fieldKey] = property.const;
    }
    if (property.default) {
      values[property.fieldKey] = property.default;
    }
    switch (property._type) {
      case "formGroup":
        values[property.fieldKey] = {};
        setDefaultValues(property, values[property.fieldKey] as Record<string, unknown>);
        break;
      case "formCondition":
        values[property.fieldKey] = {};
        let chosenCondition = property.conditions[0];
        // if default is set, try to find it in the list of possible selection const values.
        // if there is a match, default to this condition.
        // In all other cases, go with the first one.
        if (property.default) {
          const matchingConditionIndex = property.selectionConstValues.indexOf(property.default);
          if (matchingConditionIndex !== -1) {
            chosenCondition = property.conditions[matchingConditionIndex];
          }
        }

        setDefaultValues(chosenCondition, values[property.fieldKey] as Record<string, unknown>);
    }
  });
}

export function useBuildForm(
  isEditMode: boolean,
  formType: "source" | "destination",
  selectedConnectorDefinitionSpecification: ConnectorDefinitionSpecification,
  initialValues?: Partial<ConnectorFormValues>
): BuildFormHook {
  const { formatMessage } = useIntl();

  const jsonSchema: JSONSchema7 = useMemo(
    () => ({
      type: "object",
      properties: {
        name: {
          type: "string",
          title: formatMessage({ id: `form.${formType}Name` }),
          description: formatMessage({ id: `form.${formType}Name.message` }),
        },
        connectionConfiguration:
          selectedConnectorDefinitionSpecification.connectionSpecification as JSONSchema7Definition,
      },
      required: ["name"],
    }),
    [formType, formatMessage, selectedConnectorDefinitionSpecification.connectionSpecification]
  );

  const formFields = useMemo<FormBlock>(() => jsonSchemaToFormBlock(jsonSchema), [jsonSchema]);

  if (formFields._type !== "formGroup") {
    throw new FormBuildError("connectorForm.error.topLevelNonObject");
  }

  const startValues = useMemo<ConnectorFormValues>(() => {
    if (isEditMode) {
      return {
        name: "",
        connectionConfiguration: {},
        ...initialValues,
      };
    }
    const baseValues = {
      name: "",
      connectionConfiguration: {},
      ...initialValues,
    };

    setDefaultValues(formFields, baseValues as Record<string, unknown>);

    return baseValues;
  }, [formFields, initialValues, isEditMode]);

  return {
    initialValues: startValues,
    formFields,
    jsonSchema,
  };
}

// As validation schema depends on what path of oneOf is currently selected in jsonschema
export const useConstructValidationSchema = (jsonSchema: JSONSchema7, formFields: FormBlock): AnySchema =>
  useMemo(() => buildYupFormForJsonSchema(jsonSchema, formFields), [formFields, jsonSchema]);
