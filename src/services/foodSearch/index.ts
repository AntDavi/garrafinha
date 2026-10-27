export {
  createFoodSearch,
  DEFAULT_FOOD_FOR_TERM,
  MATCH_THRESHOLD,
  type FoodSearch,
  type SearchHit,
} from './foodSearch';
export { normalizeQuery, normalizeText, singularize, stripAccents } from './normalize';
export {
  parseEntry,
  parseFoodText,
  resolveFoodText,
  splitFoodText,
  type ParsedEntry,
  type ResolvedStatus,
  type ResolvedTextItem,
  type Unit,
} from './textParser';
