import React from 'react';

const Action: React.FC = () => {
  return (
    <div className="w-full bg-gradient-to-r from-white to-[#f3f4f6] md:p-20 p-10 flex justify-center">
      <div className="bg-gradient-to-r from-new-red to-periwinkle h-[200px] md:w-[70%] w-full rounded-2xl flex flex-col justify-center items-center">
        <div>
          <p className="text-xl md:text-2xl p-3">
            Ready to get your Fundraiser running on AutoPilot?
          </p>
        </div>
        <div className="py-4">
          <button className="btn rounded-full">Start a Fundraiser</button>
        </div>
      </div>
    </div>
  );
};

export default Action;

