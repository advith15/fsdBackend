class ApiError extends Error {
  constructor(statusCode, message="something went wrong",errors=[],statck=" ") {
    super();
    this.statusCode = statusCode;
    this.message = message;
    this.data=null;
    this.success=false;
    this.errors=errors

    if(statck){
        this.stack=statck;
    }
    else{
        Error.captureStackTrace(this, this.constructor);
    }
  }
}

export {ApiError}