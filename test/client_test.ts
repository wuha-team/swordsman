/* tslint:disable: no-unused-expression */
import { expect } from 'chai'
import * as watchman from 'fb-watchman'

import * as client from '../src/client'

describe('client', () => {

  it('should instantiate a watchman client', () => {
    expect(client.client).to.be.an.instanceof(watchman.Client)
  })

})
