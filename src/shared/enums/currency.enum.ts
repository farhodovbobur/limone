/**
 * The two currencies this business speaks. Materials are often bought in USD,
 * sales and wages are in UZS — so almost nothing that holds money can assume
 * one of them.
 *
 * Stored as `varchar(3)`, never as a PostgreSQL enum type: the same convention
 * as every other enum here, and adding a third currency stays an application
 * change rather than a migration.
 */
export enum Currency {
  UZS = 'UZS',
  USD = 'USD',
}
