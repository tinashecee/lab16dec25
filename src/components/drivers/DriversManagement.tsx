import React, { useEffect } from "react";

export default function DriversManagement() {
  // Encode credentials in the URL parameters
  const loginUrl = `http://track.unitrack24.online/gps?username=NyashaChipato&password=Tadiwa2020@&auto_login=true`;

  useEffect(() => {
    window.open(loginUrl, '_blank');
  }, []);

  // Return null since we don't need to render anything
  return null;
}
