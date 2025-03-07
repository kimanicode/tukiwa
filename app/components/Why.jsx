import { HeartHandshake, Bot, MessageSquareShare, ShieldCheck, Users, Clock, Wallet2, BarChart3 } from "lucide-react";

const Why = () => {

const why = [
  {
    id:222,
    title: "Seamless Fundraising",
    description: "Create, share, and manage fundraisers effortlessly with AI-powered automation.",
    icon: <HeartHandshake size={50} />
  },
  {
    id: 333,
    title: "AI-Powered Contribution Tracking",
    description: "No more manual tracking—AI updates donation records and reminds pledgers automatically.",
    icon: <Bot size={50} />
  },
  {
    id: 444,
    title: "WhatsApp & M-Pesa Integration",
    description: "Accept donations directly via M-Pesa and keep your WhatsApp group updated in real-time.",
    icon: <MessageSquareShare size={50} />
  },
  {
    id: 545,
    title: "Transparent & Secure",
    description: "AI-powered fraud detection ensures legitimacy and accountability for all fundraisers.",
    icon: <ShieldCheck size={50} />
  },
  
  {
    id: 54678,
    title: "Instant Payouts",
    description: "Withdraw funds instantly to M-Pesa or bank accounts without delays.",
    icon: <Wallet2 size={50} />
  },
  
  {
    id: 1265357,
    title: "Pledge System",
    description: "Donors can pledge to give later or set up recurring donations for long-term support.",
    icon: <Clock size={50} />
  }
];
  
  return (
    <div className='w-full bg-white  md:p-20  p-10 '>
        <h2 className='text-center p-5 md:p-10 text-base-100 md:text-4xl text-2xl'>Why Tukiwa</h2> 

      <div className="flex gap-10 md:flex-row flex-col items-center">

      <div className="flex justify-center items-center md:w-full md:min-h-screen h-1/2 p-10 ">
  <div className="mockup-phone border-green-300  ">
    <div className="mockup-phone-camera "></div>
    <div className="mockup-phone-display">
      <img
        alt="wallpaper"
        src="wall.png"
        className="md:h-full md:w-full  object-cover"
      />
    </div>
  </div>
</div>


      <div className="flex flex-wrap md:flex-row    gap-5 md:h-1/2  ">
      {
            why.map( (reason)=>{
                
                return(
                    <div className="card hover:bg-gradient-to-br from-blue-600 via-teal-600 to-green-300 text-base-100 bg-slate-100 hover:text-primary-content md:basis-[30%] basis-full shadow-2xl"  key={reason.id}>
                <div className="card-body">
                    <p className="text-green-300  ">
                        {reason.icon}
                    </p>

                    <h2 className="text-xl font-semibold">{reason.title}</h2>
                    
                    <p>{reason.description}</p>
                   
                    
                </div>
                </div>
                )

            })
        }

      </div>

     </div>

      

    </div>
  )
}

export default Why

