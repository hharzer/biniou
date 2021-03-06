import * as Knex from 'knex';

export async function up(knex: Knex): Promise<any> {
	await knex.schema.createTable('events', function(table:Knex.CreateTableBuilder) {
		table.string('id', 22).unique().primary().notNullable();
		table.string('job_id', 128).notNullable();
		table.string('hash', 32).notNullable();
		table.string('name', 128).notNullable();
		table.integer('body_type').defaultTo(1).notNullable();
		table.string('body').defaultTo('').notNullable();
		table.integer('created_time').notNullable();
		table.integer('updated_time').notNullable();
	});

	await knex.schema.createTable('job_states', function(table:Knex.CreateTableBuilder) {
		table.string('id', 22).unique().primary().notNullable();
		table.string('job_id', 128).notNullable();
		table.integer('last_started').defaultTo(0).notNullable();
		table.integer('last_finished').defaultTo(0).notNullable();
		table.text('context', 'mediumtext').defaultTo('').notNullable();
		table.integer('created_time').notNullable();
		table.integer('updated_time').notNullable();
	});
}

export async function down(knex: Knex): Promise<any> {
	await knex.schema.dropTable('events');
}

