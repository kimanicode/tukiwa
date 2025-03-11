import Image from "next/image";
import Navbar from "./components/Navbar";
import Home from "./components/Home";
import Testimonials from "./components/Testimonials";
import Why from "./components/Why";
import Steps from "./components/Steps";
import Action from "./components/Action";


export default function Page() {
  return (
    <div className=" ">
  
      <Home />  
      <Steps/>    
      <Why />
      <Testimonials />
      <Action/>

      
    </div>
  );
}
