import React, { useState, useRef, useCallback, createContext } from "react";

const LIST_REFRESH_DEBOUNCE_MS = 400;

const TicketsContext = createContext();

const TicketsContextProvider = ({ children }) => {
  const [currentTicket, setCurrentTicket] = useState({
    id: null,
    code: null,
    uuid: null
  });
  const [observationMode, setObservationMode] = useState(false);
  const [listSubTab, setListSubTab] = useState("open");
  const [listRevision, setListRevision] = useState(0);
  const messageHandlersRef = useRef({});
  const listRefreshTimerRef = useRef(null);

  const refreshTicketLists = useCallback(() => {
    if (listRefreshTimerRef.current) {
      clearTimeout(listRefreshTimerRef.current);
    }
    listRefreshTimerRef.current = setTimeout(() => {
      setListRevision(value => value + 1);
      listRefreshTimerRef.current = null;
    }, LIST_REFRESH_DEBOUNCE_MS);
  }, []);

  const registerMessageHandlers = useCallback(handlers => {
    messageHandlersRef.current = handlers || {};
    return () => {
      messageHandlersRef.current = {};
    };
  }, []);

  const notifyMessageSent = useCallback(message => {
    const handlers = messageHandlersRef.current;
    if (message?.id && handlers.append) {
      handlers.append(message);
      return;
    }
    handlers.refresh?.();
  }, []);

  return (
    <TicketsContext.Provider
      value={{
        currentTicket,
        setCurrentTicket,
        observationMode,
        setObservationMode,
        listSubTab,
        setListSubTab,
        listRevision,
        refreshTicketLists,
        registerMessageHandlers,
        notifyMessageSent
      }}
    >
      {children}
    </TicketsContext.Provider>
  );
};

export { TicketsContext, TicketsContextProvider };
