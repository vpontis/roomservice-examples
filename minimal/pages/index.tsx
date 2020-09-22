import { RoomService } from "@roomservice/browser";
import _ from "lodash";
import { useCallback, useEffect, useState } from "react";
import Cookies from "js-cookie";
import { usePolling } from "../components/usePolling";

export const useCookieState = (key, defaultValue) => {
  const [value, setValue] = useState(
    Cookies.get(key) ||
      (() => {
        Cookies.set(key, defaultValue);
        return defaultValue;
      })()
  );

  return [
    value,
    (_val) => {
      Cookies.set(key, _val);
      setValue(_val);
    },
  ];
};

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Example
 * const { map: locationMap, setValue: setLocation } = usePresence<{
 *    x: number;
 *    y: number;
 *  }>({
 *    roomId: "demo-2",
 *    key: "location",
 *    expireSec: 5,
 *  });
 *
 * @param roomId
 * @param key
 * @param expireSec
 */
function usePresence<T>({
  roomId,
  key,
  expireSec,
}: {
  roomId: string;
  key: string;
  expireSec: number;
}): { map: { [userId: string]: T }; setValue: (value: T) => void } {
  const [presence, setPresence] = useState(null);
  const [presenceMap, setPresenceMap] = useState<{ [userId: string]: T }>({});

  async function load() {
    const rs = new RoomService({
      auth: "/api/roomservice",
    });

    const room = await rs.room(roomId);
    const p = await room.presence();
    setPresence(p);

    const initialMap = await p.getAll(key);
    setPresenceMap(initialMap);

    // TODO: how do we unsubscribe
    return room.subscribe(p, key, (map) => {
      console.timeEnd(`Presence ${key}`);
      console.log(map);
      setPresenceMap(map);
      console.time(`Presence ${key}`);
    });
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const setValue = useCallback(
    (value) => {
      if (!presence) {
        return;
      }

      presence.set(key, value, expireSec);
    },
    [presence]
  );

  return { map: presenceMap, setValue };
}

function useRoomUsers({ roomId, key }): { users: string[] } {
  const { map, setValue } = usePresence<boolean>({ roomId, key, expireSec: 5 });

  usePolling(() => {
    setValue(true);
  }, 2_000);

  const users = Object.keys(map);
  return { users };
}

type ChatMessage = {
  fromName: string;
  fromEmoji: string;
  createdAt: string;
  message: string;
};

function useChat({
  roomId,
  key,
  numMessages,
}: {
  roomId: string;
  key: string;
  numMessages: number;
}): { messages: ChatMessage[]; addMessage: (message: ChatMessage) => null } {
  const [messages, setMessages] = useState(null);

  async function load() {
    const rs = new RoomService({
      auth: "/api/roomservice",
    });

    const room = await rs.room(roomId);
    const m = await room.list(key);
    console.log("m", m);

    // @ts-ignore
    setMessages(m);

    // TODO: how do we unsubscribe
    return room.subscribe(m, (_messages) => {
      console.log("okkkkkkkkkkkk");
      console.timeEnd(`List ${key}`);

      // @ts-ignore
      setMessages(_messages);

      console.time(`List ${key}`);
    });
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const addMessage = useCallback(
    (message) => {
      if (!messages) {
        return;
      }

      let _messages = messages.push(message);
      if (_messages.toArray().length > numMessages) {
        _messages = _messages.delete(0);
      }

      setMessages(_messages);
    },
    [messages]
  );

  return { messages: messages ? messages.toArray() : null, addMessage };
}

const ChatInput = ({ onSubmit }) => {
  const [value, setValue] = useState("");

  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button
        onClick={() => {
          setValue("");
          onSubmit(value);
        }}
      >
        Send
      </button>
    </div>
  );
};

export default function Home() {
  const [currentUser] = useCookieState(
    "user.id",
    "some-user-" + getRandomInt(1, 200)
  );
  const { map: locationMap, setValue: setLocation } = usePresence<{
    x: number;
    y: number;
  }>({
    roomId: "demo-2",
    key: "location",
    expireSec: 5,
  });

  const { messages, addMessage } = useChat({
    roomId: "demo-2",
    key: "chat",
    numMessages: 5,
  });
  console.log(messages);

  const { users } = useRoomUsers({
    roomId: "demo-2",
    key: "in-room",
  });

  function onMouseMove(e) {
    setLocation({
      x: e.clientX,
      y: e.clientY,
    });
  }

  return (
    <div
      onMouseMove={onMouseMove}
      className="window"
      style={{ position: "relative", width: "100vw", height: "100vh" }}
    >
      Hello! This demo works better with friends. Share the link with someone!
      <ChatInput
        onSubmit={(value) => {
          addMessage({
            fromEmoji: "😃",
            fromName: currentUser as string,
            createdAt: new Date().toISOString(),
            message: value,
          });
        }}
      />
      <div>
        {messages?.map(({ fromName, message }) => {
          return (
            <div>
              {fromName} {message}
            </div>
          );
        })}
      </div>
      <div>
        <div>
          <b>Users - I am {currentUser}</b>
        </div>

        {users.map((user) => (
          <div>{user}</div>
        ))}
      </div>
      <pre>{JSON.stringify(locationMap)}</pre>
      {_.map(locationMap, ({ x, y }, user) => {
        return (
          <div
            key={user}
            className={`marker ${user === currentUser && "me"}`}
            style={{ position: "absolute", top: y, left: x }}
          >
            {user}
          </div>
        );
      })}
      <style jsx={true}>{`
        .marker {
          // transition: all 0.05s;
        }
        .me {
          transition: none !important;
        }
      `}</style>
    </div>
  );
}
