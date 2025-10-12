// Server List Component
import React, { useState } from 'react';
import { PlusIcon, HomeIcon } from '@heroicons/react/24/outline';
import { Tooltip } from '@headlessui/react';

function ServerList() {
  const [servers] = useState([
    { id: '1', name: 'Main Server', icon: null },
    // Add more servers as needed
  ]);

  return (
    <div className="flex flex-col items-center py-3 space-y-2">
      {/* Home/DM Button */}
      <button className="w-12 h-12 bg-dark-500 hover:bg-accent hover:rounded-2xl rounded-3xl transition-all duration-200 flex items-center justify-center group">
        <HomeIcon className="w-6 h-6 text-text-primary group-hover:text-white" />
      </button>
      
      <div className="w-8 h-0.5 bg-dark-400 rounded-full mx-auto"></div>
      
      {/* Server Icons */}
      {servers.map(server => (
        <button
          key={server.id}
          className="relative w-12 h-12 bg-dark-500 hover:bg-accent hover:rounded-2xl rounded-3xl transition-all duration-200 flex items-center justify-center group"
        >
          {server.icon ? (
            <img src={server.icon} alt={server.name} className="w-full h-full rounded-full" />
          ) : (
            <span className="text-text-primary font-bold group-hover:text-white">
              {server.name.substring(0, 2).toUpperCase()}
            </span>
          )}
          
          {/* Active Indicator */}
          <span className="absolute left-0 w-1 h-8 bg-accent rounded-r-full -ml-1 opacity-0 group-hover:opacity-100 transition-opacity"></span>
        </button>
      ))}
      
      {/* Add Server Button */}
      <button className="w-12 h-12 bg-dark-500 hover:bg-accent hover:rounded-2xl rounded-3xl transition-all duration-200 flex items-center justify-center group">
        <PlusIcon className="w-6 h-6 text-green-500 group-hover:text-white" />
      </button>
    </div>
  );
}

export default ServerList;
