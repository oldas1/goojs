define([
	'goo/util/ArrayUtil'
],
/** @lends */
function (
	ArrayUtil
) {
	"use strict";

	function State(uuid) {
		this.uuid = uuid;
		this._fsm = null;
		this._actions = [];
		this._machines = [];
		this._transitions = {};
		this.vars = {};

		this.transitionTarget = null;

		this.proxy = {
			getTpf: function () {
				return this._fsm.entity._world.tpf;
			}.bind(this),
			getState: function () {
				return this;
			}.bind(this),
			getFsm: function () {
				return this._fsm;
			}.bind(this),
			getOwnerEntity: function () {
				return this._fsm.entity;
			}.bind(this),
			send: function (channels, data) {
				if (typeof channels === 'string' && this._transitions[channels]) {
					this.requestTransition(this._transitions[channels]);
				}
				/*else {
				 this._fsm._bus.emit(channels, data);
				 }*/
			}.bind(this),
			addListener: function (channelName, callback) {
				this._fsm._bus.addListener(channelName, callback);
			}.bind(this),
			removeListener: function (channelName, callback) {
				this._fsm._bus.removeListener(channelName, callback);
			}.bind(this),
			defineVariable: function (name, initialValue) {
				this.vars[name] = initialValue;
			}.bind(this),
			removeVariable: function (name) {
				delete this.vars[name];
			}.bind(this),
			getVariable: function (name) {
				if (this.vars[name] !== undefined) {
					return this.vars[name];
				} else {
					return this._fsm.getVariable(name);
				}
			}.bind(this),
			applyOnVariable: function (name, fun) {
				if (this.vars[name] !== undefined) {
					this.vars[name] = fun(this.vars[name]);
				} else {
					this._fsm.applyOnVariable(name, fun);
				}
			}.bind(this)
		};
	}

	State.prototype.setRefs = function (parentFSM) {
		this._fsm = parentFSM;
		for (var i = 0; i < this._machines.length; i++) {
			var machine = this._machines[i];
			machine.setRefs(parentFSM);
		}
	};

	State.prototype.requestTransition = function (target) {
		this.transitionTarget = target;
	};

	State.prototype.setTransition = function (eventName, target) {
		this._transitions[eventName] = target;
	};

	State.prototype.clearTransition = function (eventName) {
		delete this._transitions[eventName];
	};

	State.prototype.update = function () {
		// do on update of self
		for (var i = 0; i < this._actions.length; i++) {
			this._actions[i].update(this.proxy);
			if (this.transitionTarget) {
				var tmp = this.transitionTarget;
				this.transitionTarget = null;
				return tmp;
			}
		}

		var jump;
		// propagate on update
		for (var i = 0; i < this._machines.length; i++) {
			var machine = this._machines[i];
			jump = machine.update();
			if (jump) {
				return jump;
			}
		}
	};

	State.prototype.reset = function () {
		for (var i = 0; i < this._machines.length; i++) {
			this._machines[i].reset();
		}
	};

	State.prototype.kill = function () {
		for (var i = 0; i < this._machines.length; i++) {
			this._machines[i].kill();
		}
		for (var i = 0; i < this._actions.length; i++) {
			this._actions[i].exit(this.proxy);
		}
	};

	State.prototype.enter = function () {
		// on enter of self
		for (var i = 0; i < this._actions.length; i++) {
			this._actions[i].enter(this.proxy);
		}

		// propagate on enter
		for (var i = 0; i < this._machines.length; i++) {
			this._machines[i].enter();
		}
	};

	State.prototype.getAction = function (id) {
		if (!this._actions) {
			return undefined;
		}
		for (var i = 0; i < this._actions.length; i++) {
			var action = this._actions[i];
			if (id !== undefined && action.id === id) {
				return action;
			}
		}
		return undefined;
	};

	State.prototype.addAction = function (action) {
		// check if action is already added
		if (this._actions[action.id]) {
			return;
		}

		if (action.onCreate) {
			action.onCreate(this.proxy);
		}
		this._actions.push(action);
	};

	State.prototype.removeAction = function (action) {
		if (action.onDestroy) {
			action.onDestroy(this.proxy);
		}

		ArrayUtil.remove(this._actions, action);
	};

	State.prototype.addMachine = function (machine) {
		machine._fsm = this._fsm;
		this._machines.push(machine);
	};

	return State;
});