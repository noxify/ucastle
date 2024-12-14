import { AnyMongoAbility, ExtractSubjectType } from "@casl/ability";
import { rulesToAST } from "@casl/ability/extra";
import { CompoundCondition, Condition, FieldCondition } from "@ucast/core";
import * as drizzle from "drizzle-orm";

export type TableWithColumns<
  T extends drizzle.TableConfig = drizzle.TableConfig,
> = drizzle.Table<T> & {
  [Key in keyof T["columns"]]: T["columns"][Key];
};

type FieldOperator = (
  condition: FieldCondition,
  table: TableWithColumns,
) => drizzle.SQL | undefined;

type CompoundOperator = (
  conditions: CompoundCondition,
  table: TableWithColumns,
) => drizzle.SQL | undefined;

const eq: FieldOperator = (condition, table) => {
  const column = table[condition.field];

  return drizzle.eq(column, condition.value);
};

const gt: FieldOperator = (condition, table) => {
  const column = table[condition.field];

  return drizzle.gt(column, condition.value);
};

const gte: FieldOperator = (condition, table) => {
  const column = table[condition.field];

  return drizzle.gte(column, condition.value);
};

const lt: FieldOperator = (condition, table) => {
  const column = table[condition.field];

  return drizzle.lt(column, condition.value);
};

const lte: FieldOperator = (condition, table) => {
  const column = table[condition.field];

  return drizzle.lte(column, condition.value);
};

const and: CompoundOperator = (conditions, table) => {
  return drizzle.and(
    ...conditions.value.map((condition) => {
      return generateSQL(condition, table);
    }),
  );
};

const or: CompoundOperator = (conditions, table) => {
  return drizzle.or(
    ...conditions.value.map((condition) => {
      return generateSQL(condition, table);
    }),
  );
};

const operators: Record<string, FieldOperator | CompoundOperator> = {
  eq,
  gt,
  gte,
  lt,
  lte,
  and,
  or,
};

export function generateSQL<T extends drizzle.TableConfig>(
  condition: Condition,
  table: TableWithColumns<T>,
): drizzle.SQL | undefined {
  const { operator } = condition;

  const op = operators[operator];

  if (!op) {
    throw new Error(`Unsupported operator: ${operator}`);
  }

  return op(condition as any, table);
}

export function rulesToDrizzle<
  T extends drizzle.TableConfig,
  U extends AnyMongoAbility,
>(
  ability: U,
  action: Parameters<U["rulesFor"]>[0],
  subject: ExtractSubjectType<Parameters<U["rulesFor"]>[1]>,
  table: TableWithColumns<T>,
): drizzle.SQL | undefined {
  const condition = rulesToAST(ability, action, subject);

  if (!condition) {
    return undefined;
  }

  return generateSQL(condition, table);
}
