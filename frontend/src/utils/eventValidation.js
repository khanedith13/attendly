import { eventCategories } from "../config/events";
import { todayInput } from "./dates";

// Returns { field: "message" }. An empty object means the data is valid.
export function validateEvent(values, { publish = false, minCapacity = 0 } = {}) {
  const errors = {};

  if (!values.title.trim()) errors.title = "Event title is required.";
  else if (values.title.trim().length > 200) errors.title = "Use 200 characters or fewer.";

  if (!eventCategories.includes(values.category)) errors.category = "Select a category.";

  const capacity = Number(values.capacity);
  if (!String(values.capacity).trim()) errors.capacity = "Capacity is required.";
  else if (!Number.isInteger(capacity) || capacity < 1) {
    errors.capacity = "Enter a whole number of 1 or more.";
  } else if (capacity > 100000) {
    errors.capacity = "Capacity is too large.";
  } else if (capacity < minCapacity) {
    errors.capacity = `Capacity cannot be lower than current registrations (${minCapacity}).`;
  }

  if (!values.date) errors.date = "Date is required.";
  else if (publish && values.date < todayInput()) errors.date = "The date cannot be in the past.";

  if (!values.startTime) errors.startTime = "Start time is required.";
  if (!values.endTime) errors.endTime = "End time is required.";
  else if (values.startTime && values.endTime <= values.startTime) {
    errors.endTime = "End time must be after the start time.";
  }

  if (!values.venue.trim()) errors.venue = "Venue is required.";
  else if (values.venue.trim().length > 200) errors.venue = "Use 200 characters or fewer.";

  if (values.description.length > 1000) errors.description = "Use 1,000 characters or fewer.";

  return errors;
}