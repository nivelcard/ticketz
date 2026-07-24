import React, { useState, createContext } from "react";

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

  const refreshTicketLists = () => {
    setListRevision(value => value + 1);
  };

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
        refreshTicketLists
      }}
    >
      {children}
    </TicketsContext.Provider>
  );
};

export { TicketsContext, TicketsContextProvider };
