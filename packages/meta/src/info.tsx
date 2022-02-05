import React from "react";
import {JSONSchema7} from "json-schema";
import styled from "styled-components";

const InfoWrapper = styled.section`
  display: flex;
  flex-direction: column;
  padding: 1rem;
`;

const InfoSection = styled.div``;

const Title = styled.h3``;

const Text = styled.p``;

export const Divider = styled.hr`
  width: 80%;
  color: #0002;
`;

const Name = styled.span`
  font-weight: bold;
`;

const Prop: React.FC<{name: string}> = ({name, children}) => {
  return (
    <Text>
      <Name>{name}:</Name> {children}
    </Text>
  );
};

interface InfoProps {
  schema: JSONSchema7;
  required?: boolean;
  path?: string;
}

export const Info: React.VFC<InfoProps> = ({schema}) => {
  const {
    title,
    description,
    type,
    required,
    const: sconst,
    enum: senum,
    examples,
  } = schema;

  return (
    <InfoWrapper>
      <InfoSection>
        <Title>{title}</Title>
        <Text>{description}</Text>
      </InfoSection>
      <Divider />
      <InfoSection>
        <Prop name="Type">{Array.isArray(type) ? type.join(", ") : type}</Prop>
        <Prop name="Value">{sconst || senum?.join(", ")}</Prop>
        <Prop name="Required">{required?.join(", ")}</Prop>
      </InfoSection>
      <Divider />
      <InfoSection>
        <Prop name="Examples">{examples}</Prop>
      </InfoSection>
    </InfoWrapper>
  );
};
