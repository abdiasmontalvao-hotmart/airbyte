import { DEV_IMAGE_TAG } from "./constants";
import {
  isSource,
  isSourceDefinition,
  isSourceDefinitionSpecification,
  isSourceDefinitionSpecificationDraft,
} from "./source";
import { ConnectorDefinition, ConnectorDefinitionSpecification, ConnectorT } from "./types";

export class Connector {
  static id(connector: ConnectorDefinition): string {
    return isSourceDefinition(connector) ? connector.sourceDefinitionId : connector.destinationDefinitionId;
  }

  static isDeprecated(connector: ConnectorDefinition): boolean {
    return !connector.latestDockerImageTag;
  }

  static hasNewerVersion(connector: ConnectorDefinition): boolean {
    return (
      (!Connector.isDeprecated(connector) && connector.latestDockerImageTag !== connector.dockerImageTag) ||
      connector.dockerImageTag === DEV_IMAGE_TAG
    );
  }
}

export class ConnectorHelper {
  static id(connector: ConnectorT): string {
    return isSource(connector) ? connector.sourceId : connector.destinationId;
  }
}

export class ConnectorSpecification {
  static id(connector: ConnectorDefinitionSpecification): string {
    if (isSourceDefinitionSpecificationDraft(connector)) {
      throw new Error("Tried to get id for specification draft");
    }
    return isSourceDefinitionSpecification(connector)
      ? connector.sourceDefinitionId
      : connector.destinationDefinitionId;
  }
}
