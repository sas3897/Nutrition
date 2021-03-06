//Import dependencies
const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const sqlite = require("./db_adapter"); //Local file dependency

let server = express();
server.use(cookieParser());
server.use(bodyParser.json());
server.use(bodyParser.urlencoded({extended: true}));
server.use(express.static(path.join(__dirname, '../utils')));
server.set("view engine", "ejs");

//TODO it'd be better to make every url first check for the login and do that redirect, and if they're logged in take them to the page they wanted to go normally? (though doesn't this never resolve?)

//Home page
server.get("/", function(req:any, res:any) {
    if(is_logged_in(req)){
        let today = new Date();
        let last_week = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 8)
            .toJSON().replace("T", " ").replace("Z", "");

      sqlite.getAllIngredientNames(function (ingredients_list:string[]){   
          sqlite.getAllRecipes(function(recipes_list:string[]){
              res.render("index", { 
                         ingredients: ingredients_list, recipes: recipes_list});
          });
      });
    }
    else{
        res.redirect("/login");
    }
});

server.post("/enter_weight", function(req:any, res:any){
   if(is_logged_in(req)){
       sqlite.enterWeight(req.cookies.username, req.body.weight, function(err:any){
           if(err){
               res.send({status:"error"});
           } 
           else{
               res.send({status:"success"});
           }
       });
   }
   else{
       res.send({status:"error"});
   } 
});

server.all("/logout", function(req:any,res:any){
    if(is_logged_in(req)){ 
        res.clearCookie("username");
    }
    res.redirect("/");
});

//Login page
server.get("/login", function(req:any, res:any){
    if(is_logged_in(req)){
        res.redirect("/");
    }
    else{
        res.render("login");
    }
});
server.post("/login", function(req:any, res:any){
    if(is_logged_in(req)){
        res.redirect("/");
    }
    else{
        var user = req.body.user.toLowerCase();
        var pass = req.body.pass;
        sqlite.getUserInfo(user,
            function(userInfo:any){
                //If there are no users by that username, tell them to try again
                if(userInfo.length === 0){
                    res.render("login", {warning_string:"User not found."})
                    return;
                }
                
                if(userInfo[0].password === pass){
                    res.cookie("username", user);
                    res.redirect("/");
                }
                else{
                    res.render("login", {warning_string:"Incorrect password."});
                }
            }
        );
    }
});

server.get("/login/create_account", function(req:any, res:any){
    if(is_logged_in(req)){
        res.redirect("/");
    }
    else{
        res.render("create_account");
    }
});

server.post("/login/create_account", function(req:any, res:any){
    if(is_logged_in(req)){
        res.redirect("/");
    }
    else{
        var user = req.body.user.toLowerCase();
        var pass = req.body.pass;
        sqlite.createUser(user, pass, 
            function(){
                res.redirect("/login");
            }                
        );
    }
});

server.post("/add_ingredient", function(req:any, res:any){
    sqlite.createOrUpdateIngredient(req.body.ingredient_name, req.body.nutrients, req.body.units, req.body.amounts, 
    function(err_msg:string){
        res.json({err:err_msg});
    });   
});

server.post("/add_recipe", function(req:any, res:any){
    sqlite.createOrUpdateRecipe(req.body.recipe_name, req.body.ingredients, 
        function(potentialErr:string){
            //Success message
            res.json({err:potentialErr});
        }
    );
});

server.post("/add_meal", function(req:any, res:any){
    sqlite.createOrUpdateMeal(req.body.meal_name, parseFloat(req.body.meal_weight), req.body.nutrients, 
        function(potentialErr:string){
            //Success message
            res.json({err:potentialErr});
        } 
    );
});

server.post("/get_meal", function(req:any, res:any){
    sqlite.getMeal(parseInt(req.body.meal_id), 
        function(meal_info:string[]){
            res.send(meal_info);
        }
    );
});

server.post("/enter_cal_entry", function(req:any, res:any){
    if(is_logged_in(req)){
        sqlite.enterCalEntry(req.cookies.username, req.body.nutrients, function(err:any){
           if(err){
               res.send({status:"error"});
           } 
           else{
               res.send({status:"success"});
           }
        });
    }
    else{
        res.redirect("/login");
    }
});

server.post("/enter_meal_cal_entry", function(req:any, res:any){
    sqlite.enterMealCalEntry(req.cookies.username, 
                             parseInt(req.body.meal_id), 
                             parseFloat(req.body.amnt_left), 
                             req.body.cal_vals,
                             req.body.meal_vals
                            );
});

server.post("/get_ingredient", function(req:any, res:any){
    sqlite.getIngredient(req.body.ingredient_name, function(ingredient_info:string[]){
        res.send(ingredient_info);
    });
});

server.get("/get_ingredient_list", function(req:any, res:any){
    sqlite.getAllIngredientNames(function (ingredients_list:string[]){
        res.send(ingredients_list);
    });
});

server.get("/get_recipe_list", function(req:any, res:any){
    sqlite.getAllRecipes(function(recipes_list:string[]){
        res.send(recipes_list);
    });
});

server.post("/get_recipe_ingredients", function(req:any, res:any){
    sqlite.getRecipeIngredients(req.body.recipe_name, function(recipe_ing_list:string[]){
        res.send(recipe_ing_list);
    });
});

server.get("/get_meal_list", function(req:any, res:any){
    sqlite.getAllMeals(function(meals_list:any){
        res.send(meals_list);
    });
});

server.get("/manage_values", function(req:any, res:any){
    res.render("manage_values");
});

server.post("/get_weights", function(req:any, res:any){
    if(is_logged_in(req)){
        sqlite.getWeights(req.cookies.username, req.body.timespan, function(weights_list:string[]){
            res.send(weights_list);
        });
    }
    else{
        res.redirect("/login");
    }
});

server.post("/get_calorie_entries", function(req:any, res:any){
    if(is_logged_in(req)){
        sqlite.getCalEntries(req.cookies.username, req.body.timespan, function(calories_list:string[]){
            res.send(calories_list);
        });
    }
    else{
        res.redirect("/login");
    }
});

server.post("/del_calorie_entry", function(req:any, res:any){
    if(is_logged_in(req)){
        sqlite.delCalEntry(req.body.entry_id, function(err:any){
           if(err){
               res.send({status:"error"});
           } 
           else{
               res.send({status:"success"});
           }
        });
    }
    else{
        res.redirect("/login");
    }
});

server.post("/del_ingredient", function(req:any, res:any){
    sqlite.delIngredient(req.body.ing_name, function(err:any){
        if(err){
            res.send({status:"error"});
        }
        else{
            res.send({status:"success"});
        }
    });
});

server.post("/del_meal", function(req:any, res:any){
    sqlite.delMeal(req.body.meal_id, function(err:any){
        if(err){
            res.send({status:"error"});
        }
        else{
            res.send({status:"success"});
        }
    });
});

server.post("/del_recipe", function(req:any, res:any){
    sqlite.delRecipe(req.body.recipe_name, function(err:any){
        if(err){
            res.send({status:"error"});
        }
        else{
            res.send({status:"success"});
        }
    });
});

function is_logged_in(req:any){
    //Is there a username, or no?
    return req.cookies.username !== undefined;
}


server.listen(8080, "192.168.1.230", 
  function(){
      console.log("Cal-Track is now running.");
});
