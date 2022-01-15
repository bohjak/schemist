import React from "react";
import {JSONSchema7} from "json-schema";
import styled from "styled-components";

const InfoWrapper = styled.section`
  border: thin black solid;
`;

interface InfoProps {
  schema: JSONSchema7;
}

export const Info: React.VFC<InfoProps> = ({schema}) => {
  return <InfoWrapper>{JSON.stringify(schema)}</InfoWrapper>;
};
