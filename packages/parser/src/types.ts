/**
 * Schema agnostic intermediate representation
 */
export interface SchemaNode {
  title: string;
  ref: string;
  children: SchemaNode[];
  type: string;
  required: boolean;
  key: string;
  path: string[];
  raw: Record<string, unknown>;
  id: string;
}
