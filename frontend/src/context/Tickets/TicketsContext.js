import React, { useState, createContext } from "react";

const TicketsContext = createContext();

const TicketsContextProvider = ({ children }) => {
  const [currentTicket, setCurrentTicket] = useState({
    id: null,
    code: null,
    uuid: null
  });
  const [observationMode, setObservationMode] = useState(false);

  return (
    <TicketsContext.Provider
      value={{
        currentTicket,
        setCurrentTicket,
        observationMode,
        setObservationMode
      }}
    >
      {children}
    </TicketsContext.Provider>
  );
};

export { TicketsContext, TicketsContextProvider };
