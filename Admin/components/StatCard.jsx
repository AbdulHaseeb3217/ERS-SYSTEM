import React from 'react';

const StatCard = ({ title, value, trend, icon, iconColorClass }) => {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col relative text-left">
      <div className="flex justify-between items-start mb-4">
        {/* Icon Container */}
        <div className={`p-2.5 rounded-lg text-white ${iconColorClass}`}>
          {icon}
        </div>
        {/* Trend Percentage */}
        <span className="text-[11px] font-bold text-green-500">
          {trend}
        </span>
      </div>
      <div className="mt-1">
        {/* Main Value */}
        <h3 className="text-xl font-bold text-gray-800">{value}</h3>
        {/* Title/Label */}
        <p className="text-[11px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
          {title}
        </p>
      </div>
    </div>
  );
};

export default StatCard;