'use client'
import { Quote } from "lucide-react";

const Testimonials = () => {
    const testimonials = [
        {
          id:1,
          name: "Grace Wanjiru",
          role: "Medical Fundraiser Organizer",
          message: "Tukiwa helped us raise KES 1.2M in just three days for my brother’s surgery. The automatic tracking and M-Pesa integration made everything seamless. No more manual follow-ups!"
        },
        {
            id:2,
          name: "David Mwaura",
          role: "Frequent Donor",
          message: "I love how easy it is to contribute! With just one click, I send my donation via M-Pesa, and I get instant confirmation. Plus, I can track all my past contributions in one place."
        },
        {
            id:3,
          name: "Esther Kamau",
          role: "Education Fundraiser Beneficiary",
          message: "Thanks to Tukiwa, my daughter got her school fees covered in time. The transparency and updates reassured donors, making them confident in contributing."
        },
        
      ];
      
  return (
    <div className='w-full bg-white  md:p-20  p-10 '>
        <h1 className="text-center p-5 md:p-10 text-base-100 md:text-4xl text-2xl">
            What People Are Saying
        </h1>

        <div className="flex flex-wrap gap-5 justify-center w-full">
        {
            testimonials.map( (testimonial)=>{
                
                return(
                    <div className="card bg-gradient-to-br from-blue-600 via-teal-600 to-green-300 text-primary-content md:basis-[30%] basis-full shadow-2xl"  key={testimonial.id}>
                <div className="card-body">
                    <h2 className="text-white">
                        <Quote />
                    </h2>
                    
                    <p>{testimonial.message}</p>
                    <div className="divider"></div>
                    <div className="card-actions flex flex-col ">
                    <h2 className="card-title">{testimonial.name}</h2>
                    <span className="italic">{testimonial.role}</span>

                    <div>
                                        <div className="rating">
                      <input type="radio" name="rating-4" className="mask mask-star-2 bg-white" aria-label="1 star" />
                      <input type="radio" name="rating-4" className="mask mask-star-2 bg-white" aria-label="2 star" defaultChecked />
                      <input type="radio" name="rating-4" className="mask mask-star-2 bg-white" aria-label="3 star" />
                      <input type="radio" name="rating-4" className="mask mask-star-2 bg-white" aria-label="4 star" />
                      <input type="radio" name="rating-4" className="mask mask-star-2 bg-white" aria-label="5 star" />
                 </div>
                    </div>

                    

                    </div>
                </div>
                </div>
                )

            })
        }
        </div>
       


      
    </div>
  )
}

export default Testimonials
