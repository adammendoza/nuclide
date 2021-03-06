'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import type WS from 'ws';

import {Emitter} from 'event-kit';
import {WebSocketTransport} from '../lib/WebSocketTransport';

function mockSocket(): WS {
  const result = (new Emitter(): any);
  result.close = () => { result.emit('close'); };
  spyOn(result, 'on').andCallThrough();
  return result;
}

describe('WebSocketTransport', () => {
  let socket: WS = (null: any);
  let transport: WebSocketTransport = (null: any);

  beforeEach(() => {
    socket = mockSocket();
    transport = new WebSocketTransport('42', socket, false);
  });

  it('constructor', () => {
    expect(transport.isClosed()).toBe(false);
    expect(socket.on).toHaveBeenCalledWith('message', jasmine.any(Function));
    expect(socket.on).toHaveBeenCalledWith('error', jasmine.any(Function));
    expect(socket.on).toHaveBeenCalledWith('close', jasmine.any(Function));
  });

  it('messsage', () => {
    const payload = JSON.stringify({foo: 42});
    let result;
    transport.onMessage().subscribe(message => { result = message; });
    socket.emit('message', payload);
    expect(result).toEqual(payload);
  });

  it('send - success', () => {
    waitsForPromise(async () => {
      const s: any = socket;
      s.send = jasmine.createSpy('send').andCallFake((data, callback) => callback(null));
      const data = JSON.stringify({foo: 42});
      const result = await transport.send(data);
      expect(result).toBe(true);
      expect(socket.send).toHaveBeenCalledWith(data, jasmine.any(Function));
    });
  });

  it('send - error', () => {
    waitsForPromise(async () => {
      const s: any = socket;
      s.send = jasmine.createSpy('send').andCallFake((data, callback) => callback(new Error()));
      const data = JSON.stringify({foo: 42});
      const result = await transport.send(data);
      expect(result).toBe(false);
      expect(socket.send).toHaveBeenCalledWith(data, jasmine.any(Function));
    });
  });

  it('close event', () => {
    let closed = false;
    transport.onClose(() => {
      // close event should be published exactly once
      expect(closed).toBe(false);
      closed = true;
    });
    socket.emit('close');
    expect(transport.isClosed()).toBe(true);
    expect(closed).toBe(true);

    // This shouldn't throw
    socket.emit('close');
  });

  it('manual close', () => {
    let closed = false;
    transport.onClose(() => {
      // close event should be published exactly once
      expect(closed).toBe(false);
      closed = true;
    });
    transport.close();
    expect(transport.isClosed()).toBe(true);
    expect(closed).toBe(true);

    // This shouldn't throw
    socket.emit('close');
  });

  it('error', () => {
    let error;
    const expected = new Error('error message');
    transport.onError(actual => {
      error = actual;
    });
    socket.emit('error', expected);

    expect(error).toBe(expected);
  });
});
