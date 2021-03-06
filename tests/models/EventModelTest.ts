import { asyncTest, clearDatabase, initDatabase } from '../testUtils';
import EventModel from '../../app/models/EventModel';
import { msleep } from '../../app/utils/timeUtils';
import { Event } from '../../app/db';
import { SaveOptions } from '../../app/models/BaseModel';

describe('EventModelTest', function() {

	beforeEach(async (done) => {
		await initDatabase();
		done();
	});

	it('should return last events', asyncTest(async function() {
		const eventModel = new EventModel();
		const baseProps:Event = { name: 'test', job_id: 'test', hash: '123' };

		await eventModel.save({ ...baseProps, body: 'one' }); await msleep(1);
		await eventModel.save({ ...baseProps, body: 'two' }); await msleep(1);
		await eventModel.save({ ...baseProps, body: 'three' }); await msleep(1);

		{
			const events = await eventModel.eventsSince('test', 0, []);
			expect(events.length).toBe(3);
		}

		{
			await msleep(1);
			const events = await eventModel.eventsSince('test', Date.now(), []);
			expect(events.length).toBe(0);
		}
	}));

	it('should return last events (several events with same timestamp)', asyncTest(async function() {
		const eventModel = new EventModel();
		const baseProps:Event = { name: 'test', job_id: 'test', hash: '123', created_time: 1000, updated_time: 1000 };
		const saveOptions:SaveOptions = { autoTimestamp: false };

		const event1:Event = await eventModel.save({ ...baseProps, body: 'one' }, saveOptions);
		const event2:Event = await eventModel.save({ ...baseProps, body: 'two' }, saveOptions);
		const event3:Event = await eventModel.save({ ...baseProps, body: 'three' }, saveOptions);
		const event4:Event = await eventModel.save({ ...baseProps, body: 'four', created_time: 2000, updated_time: 2000 }, saveOptions);

		{
			const events = await eventModel.eventsSince('test', 1000, []);
			expect(events.length).toBe(4);
		}

		{
			const events = await eventModel.eventsSince('test', 1000, [event1.id]);
			expect(events.length).toBe(3);
		}

		{
			const events = await eventModel.eventsSince('test', 1000, [event1.id, event2.id, event3.id]);
			expect(events.length).toBe(1);
			expect(events[0].id).toBe(event4.id);
		}
	}));

});
