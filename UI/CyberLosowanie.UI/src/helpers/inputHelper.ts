import React from "react";

const inputHelper = <T extends Record<string, string>>(
  e: React.ChangeEvent<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >,
  data: T
): T => {
  return { ...data, [e.target.name]: e.target.value };
};

export default inputHelper;
