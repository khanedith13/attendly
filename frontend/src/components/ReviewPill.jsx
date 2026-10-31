import { useEffect } from "react";
import { useAsyncData } from "../hooks/useAsyncData";
import { getReviewCount } from "../services/adminService";
import { subscribeReviews } from "../utils/reviewBus";
import Pill from "./Pill";

export default function ReviewPill() {
  const { data: count, reload } = useAsyncData(getReviewCount);

  // Refresh whenever an admin action changes what needs review.
  useEffect(() => subscribeReviews(reload), [reload]);

  if (count == null) return null;
  if (count === 0) return <Pill tone="success">All reviewed</Pill>;
  return <Pill tone="warning">{`${count} review${count === 1 ? "" : "s"} needed`}</Pill>;
}