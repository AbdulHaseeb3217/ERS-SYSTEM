import React from 'react';

export const Button = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyles = "font-medium rounded-lg text-sm px-5 py-2.5 focus:outline-none transition-all duration-200 flex items-center justify-center gap-2";
  
  const variants = {
    primary: "text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300",
    success: "text-white bg-green-500 hover:bg-green-600 focus:ring-4 focus:ring-green-300",
    outline: "text-gray-900 bg-white border border-gray-200 hover:bg-gray-100 hover:text-blue-700 focus:z-10 focus:ring-4 focus:ring-gray-200",
    ghost: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};