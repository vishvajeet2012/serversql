import { authenticateJWT  ,DecodedToken} from "../middleware/auth";
import { sql } from "../db/inidex";
import { Request, Response } from "express";

interface User {
  user_id: number;  
  name?: string;
  email?: string;
  mobile_number?: string;
  profile_picture?: string;
  password_hash?: string;  /// ? question mark use jb htoa hai jb  filed ka hona or na hona matter nahi  kr ta hai 
  role?: 'Admin' | 'Teacher' | 'Student';
  status?: 'Active' | 'Inactive';
  created_at?: string;
  updated_at?: string;
}

export const manageStudents =async (req:Request,res:Response): Promise<Response> => {
   
    try{
        
            const { status  ,user_id , mobile_number,role, name, email } =  req.body as any

            const parsedUserId = Number(user_id?.toString().trim())

           if (!parsedUserId) {
      return res.status(400).json({
        message: "user id required plase try again",
        status: false
      });}
      
      if (role === 'Admin') {
  res.status(403).json({
    message: "You cannot change role to admin — permission not allowed."
  });
}
      

    const checkUser=  await sql`
     SELECT user_id, name, email, mobile_number, profile_picture,
            role, status, created_at, updated_at
     FROM users
     WHERE user_id = ${parsedUserId}
    ` as User[];



    if(checkUser.length ===0 ){
        return res.status(404).json({
            message:"user not found ",
            status: false
        })



    }




                const updateFields: Partial<User> = {};



    if (name !== undefined) updateFields.name = name;
    if (email !== undefined) updateFields.email = email;
    if (mobile_number !== undefined) updateFields.mobile_number = mobile_number;
    if (role !== undefined) updateFields.role = role;
    if (status !== undefined) updateFields.status = status;


    const now = new Date();


    const updateUser= await sql`
    UPDATE users 
    SET
        name = CASE WHEN ${name !== undefined} THEN ${name} ELSE name END,
        email = CASE WHEN ${email !== undefined} THEN ${email} ELSE email END,
        mobile_number = CASE WHEN ${mobile_number !== undefined} THEN ${mobile_number} ELSE mobile_number END,
        role = CASE WHEN ${role !== undefined} THEN ${role} ELSE role END,
        status = CASE WHEN ${status !== undefined} THEN ${status} ELSE status END,
        updated_at = ${now}
      WHERE user_id = ${parsedUserId}
      RETURNING user_id, name, email, mobile_number, profile_picture,
                role, status, created_at, updated_at
    ` as User[];
    if(updateUser){
    return res.status(200).json({message:"update successfully ",status:true, data:updateUser[0]})
    }else{
            return res.status(400).json({message:"error while updateding data  ",status:false,})



    }
                    }catch(error){
                        return res.status(500).json({message:"internal  server error"  ,status:false, 
                            error:error
                        })
                    }




}



export const getAllUserData = async (req: Request, res: Response): Promise<Response> => {

  try{
  const {role}= req.body
          if(!role){
   return res.status(400).json({  message: "Role is required",status: false })}

             const validRoles = ['Admin', 'Teacher', 'Student'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role. role must be  Admin, Teacher, or Student", status: false
      });
    }  

     const users = await sql`
      SELECT user_id, name, email, mobile_number, profile_picture,
             role, status, created_at, updated_at
      FROM users
      WHERE role = ${role}
      ORDER BY created_at DESC
    ` as User[];

     return res.status(200).json({
      message: `${role} users data  successfully fetch`,  status: true,user: users,count: users.length  });


}catch(error){
  console.log(error,"get all user api not working")
 return res.status(500).json({message:"internal  server error"  ,status:false,  error:error})
}
}
