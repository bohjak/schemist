import React from "react";
import styled from "styled-components";
import {Info} from "./info";
import schema from "./schema.json";
import {deref} from "@schemist/parser";

const Headline = styled.h1`
  color: blue;
`;

export const App: React.VFC = () => {
  const [loading, setLoading] = React.useState(true);
  const [s, setS] = React.useState(schema);

  React.useEffect(() => {
    deref({unsafeAllowUriAddressResolution: true}, {}, schema, schema.$ref)
      .then(([val, err]) => {
        if (err || typeof val !== "object") {
          return console.error(err);
        }

        setS({...schema, ...val});
      })
      .finally(() => setLoading(false));
  }, []);

  return loading ? (
    <Headline>Loading ...</Headline>
  ) : (
    <div>
      <Headline>Yay!!!</Headline>
      <Info schema={s} />
    </div>
  );
};
