import bows from 'bows';
import queryString from 'query-string';

import { ACTION_TYPES } from './reducer';
import { objectify } from 'store/objectify';
import { getFilterKey } from "./helpers";

const log = bows('Programs');


export const createOrUpdatePrograms = (programs) => {
  return {
    type: ACTION_TYPES.fetchSuccess,
    payload: {
      programs: objectify(programs),
    }
  }
};


/**
 * @param data {Array}
 * @param filterKey {String}
 */
export const createFilter = (data, {filterKey}) => {
  if (typeof data === 'undefined' || !Array.isArray(data)) {
    throw new Error('Data provided to setFilter must be an Array.');
  }
  return {
    type: ACTION_TYPES.createFilters,
    payload: {
      filterKey,
      filterValue: data.map(d => d.id),
    }
  }
};

/**
 * @param data {Array}
 * @param filterKey {String}
 */
export const updateFilter = (data, {filterKey}) => {
  if (typeof data === 'undefined' || !Array.isArray(data)) {
    throw new Error('Data provided to setFilter must be an Array.');
  }
  return {
    type: ACTION_TYPES.updateFilters,
    payload: {
      filterKey,
      filterValue: data.map(d => d.id),
    }
  }
};


/**
 * @param filterProps {Object} can be any filter, not just 'code' and 'year'
 */
export const fetchProgramsByFilter = (filterProps) => {
  if (typeof filterProps === 'undefined') {
    throw new Error('Must supply filterProps to fetchProgramsByFilter.');
  }
  const search = queryString.stringify(filterProps);
  return fetchFromApi(`/programs?${search}`, { filterKey: getFilterKey(filterProps) });
};


/**
 * Create Program Thunk Sequence
 * @param program
 * @returns {Function} Thunk
 */
export const createProgram = (program) => {
  // Steps:
  // 1. sanitize input
  // 2. POST
  // 3. update byId
  // 4. *update* a filter to append item
  //    - do this last in case so filter listeners will get updates

  // 1. todo

  const filterKey = getFilterKey({
    code: program.code,
    year: program.year,
  });

  log(`Posting (creating): ${JSON.stringify(program)}`);

  return (dispatch, getState, api) => {
    // 2.
    return api('/programs', {
      method: 'POST',
      body: JSON.stringify(program),
    })
      .then((resp) => {
        if (!resp.data) {
          throw new Error('Data not provided in response');
        }
        log(`Posted: ${resp.data}`);
        // 3.
        dispatch(createOrUpdatePrograms(resp.data));
        return resp;
      })
      .then((resp) => {
        // 4.
        let d = resp.data;

        if (!Array.isArray(d)) {
          d = [d]
        }
        dispatch(updateFilter(d, {filterKey}));
        return resp;
      })
      .catch((error) => {
        log(`Error: ${error}`);
        // todo - status messages
        return error;
      });
  }
};


/**
 * Update Program Thunk Sequence
 * @param program
 * @returns {Function} Thunk
 */
export const updateProgram = (program) => {
  // Steps:
  // 1. sanitize input
  // 2. PUT
  // 3. update byId

  // 1. todo

  log(`Putting (updating): ${JSON.stringify(program)}`);

  return (dispatch, getState, api) => {
    // 2.
    return api(`/programs/${program.id}`, {
      method: 'PUT',
      body: JSON.stringify(program),
    })
      .then((resp) => {
        if (!resp.data) {
          throw new Error('Data not provided in response');
        }
        log(`Putted: ${resp.data}`);
        // 3.
        dispatch(createOrUpdatePrograms(resp.data));
        return resp;
      })
      .catch((error) => {
        log(`Error: ${error}`);
        // todo - status messages
        return error;
      });
  }
};


/**
 * Fetch Programs Thunk Sequence
 * @param path
 * @param props
 * @returns {function(*, *, *)}
 */
export const fetchFromApi = (path, props) => {
  // Steps:
  // 1. GET
  // 2. update byId
  // 3. *create* new filter values for this search key filter
  //    - do this last in case so filter listeners will update

  log(`Fetching: ${path}`);

  return (dispatch, getState, api) => {
    dispatch({
      type: ACTION_TYPES.fetchRequest,
    });
    // 1.
    return api(path)
      .then((resp) => {
        if (!resp.data) {
          throw new Error('Data not provided in response');
        }
        log(`Fetched: ${resp.data}`);
        // 2.
        dispatch(createOrUpdatePrograms(resp.data));
        return resp;
      })
      .then((resp) => {
        // 3.
        dispatch(createFilter(resp.data, props));
        return resp;
      })
      .catch((error) => {
        // todo - status messages
        log(`Error: ${error}`);
        dispatch({
          type: ACTION_TYPES.fetchError,
          payload: {
            message: error.message || 'Something went wrong.'
          }
        });
        return error;
      })
  }
};
