import { useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import Chip from "../../components/Chip";
import EventCard from "../../components/EventCard";
import LoadingBlock from "../../components/LoadingBlock";
import Notice from "../../components/Notice";
import PageHeader from "../../components/PageHeader";
import SearchInput from "../../components/SearchInput";
import { useAsyncData } from "../../hooks/useAsyncData";
import { useAuth } from "../../hooks/useAuth";
import { useTopbarIcon } from "../../hooks/useTopbarBadge";
import { listEvents, registerForEvent } from "../../services/studentService";
import { eventCategories } from "../../config/events";
import "./Browse.css";

const categories = ["All", ...eventCategories];

export default function BrowseEvents() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const load = useCallback(() => listEvents(user.id), [user.id]);
  const { data, loading, reload } = useAsyncData(load);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("date");
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState(null);

  useTopbarIcon("⌕");

  if (loading) return <LoadingBlock />;

  const query = search.trim().toLowerCase();
  const visible = data
    .filter((event) => category === "All" || event.category === category)
    .filter(
      (event) =>
        !query ||
        [event.title, event.venue, event.organizer, event.category].some((field) =>
          field.toLowerCase().includes(query),
        ),
    )
    .sort(
      sort === "title"
        ? (a, b) => a.title.localeCompare(b.title)
        : (a, b) => new Date(a.startsAt) - new Date(b.startsAt),
    );

  async function handleRegister(event) {
    setBusyId(event.id);
    setMessage(null);
    try {
      await registerForEvent(user, event.id);
      setMessage({ tone: "success", text: `You are registered for ${event.title}.` });
      reload();
    } catch (error) {
      setMessage({ tone: "danger", text: error.message });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Discover"
        title="Campus events"
        subtitle="Find events that match your interests and register in a few clicks."
        actions={
          <Button variant="outline" onClick={() => navigate("/student/registrations")}>
            ◷ My registrations
          </Button>
        }
      />

      <div className="toolbar">
        <SearchInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search event name, organizer, or topic"
        />
        {categories.map((name) => (
          <Chip key={name} active={category === name} onClick={() => setCategory(name)}>
            {name}
          </Chip>
        ))}
        <select
          className="toolbar__sort"
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          aria-label="Sort events"
        >
          <option value="date">Sort: Soonest</option>
          <option value="title">Sort: A–Z</option>
        </select>
      </div>

      {message && (
        <Notice tone={message.tone}>
          {message.text}{" "}
          {message.tone === "success" && <Link to="/student/registrations">View ticket</Link>}
        </Notice>
      )}

      {visible.length === 0 ? (
        <p className="toolbar__empty">No events match your search.</p>
      ) : (
        <div className="grid-3">
          {visible.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              busy={busyId === event.id}
              onRegister={handleRegister}
            />
          ))}
        </div>
      )}
    </>
  );
}
