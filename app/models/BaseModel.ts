import db, { WithDates, WithUuid, Event, Job, JobState, databaseSchema } from '../db';
import * as Knex from 'knex';
import { transactionHandler } from '../utils/dbUtils';
import uuidgen from '../utils/uuidgen';
import { ErrorUnprocessableEntity, ErrorBadRequest } from '../utils/errors';

export interface ModelOptions {

}

export interface SaveOptions {
	isNew?: boolean,
	skipValidation?: boolean,
	validationRules?: any,
}

export interface DeleteOptions {
	validationRules?: any,
}

export interface ValidateOptions {
	isNew?: boolean
	rules?: any,
}

export default abstract class BaseModel {

	private options_:ModelOptions = null;
	private defaultFields_:string[] = [];

	constructor(options:ModelOptions = null) {
		this.options_ = Object.assign({}, options);
	}

	get options():ModelOptions {
		return this.options_;
	}

	get db():Knex<any, any[]> {
		if (transactionHandler.activeTransaction) return transactionHandler.activeTransaction;
		return db;
	}

	get defaultFields():string[] {
		if (!this.defaultFields_.length) {
			this.defaultFields_ = Object.keys(databaseSchema[this.tableName]);
		}
		return this.defaultFields_.slice();
	}

	get tableName():string {
		throw new Error('Not implemented');
	}

	hasDateProperties():boolean {
		return true;
	}

	async startTransaction():Promise<number> {
		return transactionHandler.start();
	}

	async commitTransaction(txIndex:number):Promise<void> {
		return transactionHandler.commit(txIndex);
	}

	async rollbackTransaction(txIndex:number):Promise<void> {
		return transactionHandler.rollback(txIndex);
	}

	async all():Promise<Event[] | Job[]> {
		return this.db(this.tableName).select(...this.defaultFields);
	}

	async fromApiInput(object:Event | Job | JobState):Promise<Event | Job | JobState> {
		return object;
	}

	toApiOutput(object:any):any {
		return { ...object };
	}

	async validate(object:Event | Job | JobState, options:ValidateOptions = {}):Promise<Event | Job | JobState> {
		if (!options.isNew && !(object as WithUuid).id) throw new ErrorUnprocessableEntity('id is missing');
		return object;
	}

	async isNew(object:Event | Job | JobState, options:SaveOptions):Promise<boolean> {
		if (options.isNew === false) return false;
		if (options.isNew === true) return true;
		return !(object as WithUuid).id;
	}

	async save(object:Event | Job | JobState, options:SaveOptions = {}):Promise<Event | Job | JobState> {
		if (!object) throw new Error('Object cannot be empty');

		const toSave = Object.assign({}, object);

		const isNew = await this.isNew(object, options);

		if (isNew && !(toSave as WithUuid).id) {
			(toSave as WithUuid).id = uuidgen();
		}

		if (this.hasDateProperties()) {
			const timestamp = Date.now();
			if (isNew) {
				(toSave as WithDates).created_time = timestamp;
			}
			(toSave as WithDates).updated_time = timestamp;
		}

		if (options.skipValidation !== true) object = await this.validate(object, { isNew: isNew, rules: options.validationRules ? options.validationRules : {} });

		if (isNew) {
			await this.db(this.tableName).insert(toSave);
		} else {
			const objectId:string = (toSave as WithUuid).id;
			if (!objectId) throw new Error('Missing "id" property');
			// await cache.delete(objectId);
			delete (toSave as WithUuid).id;
			const updatedCount:number = await this.db(this.tableName).update(toSave).where({id: objectId });
			toSave.id = objectId;

			// Sanity check:
			if (updatedCount !== 1) throw new ErrorBadRequest(`one row should have been updated, but ${updatedCount} row(s) were updated`);
		}

		return toSave;
	}

	async load(id:string):Promise<Event | Job | JobState> {
		if (!id) throw new Error('id cannot be empty');

		return this.db(this.tableName).select(this.defaultFields).where({ id: id }).first();

		// let cached:object = await cache.object(id);
		// if (cached) return cached;

		// cached = await this.db(this.tableName).select(this.defaultFields).where({ id: id }).first();
		// await cache.setObject(id, cached);
		// return cached;
	}

	async delete(id:string | string[]):Promise<void> {
		if (!id) throw new Error('id cannot be empty');

		const ids = typeof id === 'string' ? [id] : id;

		if (!ids.length) throw new Error('no id provided');

		const query = this.db(this.tableName).where({ id: ids[0] });
		for (let i = 1; i < ids.length; i++) query.orWhere({ id: ids[i] });

		// await cache.delete(ids);

		const deletedCount = await query.del();
		if (deletedCount !== ids.length) throw new Error(`${ids.length} row(s) should have been deleted by ${deletedCount} row(s) were deleted`);
	}

}
