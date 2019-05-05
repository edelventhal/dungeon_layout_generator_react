let BOUND_OFFSHOOTS = false;

let Coordinate = function( xOrCoordinate, y )
{
    if ( typeof( xOrCoordinate ) === "object" )
    {
        this.x = xOrCoordinate.x;
        this.y = xOrCoordinate.y;
    }
    else 
    {
        this.x = xOrCoordinate;
        this.y = y;
    }
    
    this.getKey = function()
    {
        return this.x + "," + this.y;
    };
    
    this.toString = function()
    {
        return "(" + this.x + "," + this.y + ")";
    };
    
    this.copy = function()
    {
        return new Coordinate( this );
    };
    
    this.createSum = function( otherCoordinate )
    {
        return new Coordinate( this.x + otherCoordinate.x, this.y + otherCoordinate.y );
    };
};

let DIRECTION_DELTAS =
[
    new Coordinate( 1, 0 ),
    new Coordinate( -1, 0 ),
    new Coordinate( 0, 1 ),
    new Coordinate( 0, -1 )
];

let ExpandableBounds = function( maxSize, minCoordinate, maxCoordinate )
{
    this.maxSize = maxSize.copy();
    this.min = minCoordinate ? minCoordinate.copy() : new Coordinate( 0, 0 );
    this.max = maxCoordinate ? maxCoordinate.copy() : new Coordinate( 0, 0 );
    
    this.getSize = function()
    {
        return new Coordinate( ( this.max.x - this.min.x ) + 1, ( this.max.y - this.min.y ) + 1 );
    };
    
    this.toString = function()
    {
        return "[min: " + this.min.toString() + " max: " + this.max.toString() + " size: " + this.getSize().toString() + " maxSize: " + this.maxSize.toString() + "]";
    };
    
    this.updateWithCoordinate = function( coordinate )
    {
        this.min = new Coordinate( Math.min( this.min.x, coordinate.x ), Math.min( this.min.y, coordinate.y ) );
        this.max = new Coordinate( Math.max( this.max.x, coordinate.x ), Math.max( this.max.y, coordinate.y ) );
    };
    
    //given the maximum size passed in, do we contain or can we expand to contain the passed in coordinate?
    this.canContainCoordinate = function( coordinate )
    {
        let size = this.getSize();
        
        if ( size.x >= this.maxSize.x && ( coordinate.x < this.min.x || coordinate.x > this.max.x ) )
        {
            return false;
        }
    
        if ( size.y >= this.maxSize.y && ( coordinate.y < this.min.y || coordinate.y > this.max.y ) )
        {
            return false;
        }
    
        return true;
    };
    
    this.copy = function()
    {
        return new ExpandableBounds( this.maxSize, this.min, this.max );
    };
};

let LevelGenData = function( startCoordinate, maxSize )
{
    this.startCoordinate = startCoordinate;
    this.endCoordinate = startCoordinate.copy();
    this.bounds = new ExpandableBounds( maxSize, startCoordinate, this.endCoordinate );
    this.level = {};
    this.pathStack = [];
    this.pathLookup = {};
    this.open = [];
    this.closed = {};
    
    this.roomExists = function( coordinate )
    {
        return !!this.level[ coordinate.getKey() ];
    };
    
    this.coordinateIsClosed = function( coordinate )
    {
        return !!this.closed[ coordinate.getKey() ];
    };
    
    this.closeCoordinate = function( coordinate )
    {
        this.closed[ coordinate.getKey() ] = true;
    };
    
    this.popPathStack = function()
    {
        if ( this.canPopPathStack() )
        {
            let coordinate = this.pathStack.pop();
            this.pathLookup[coordinate.getKey()] = false;
            return coordinate;
        }
        return null;
    };
    
    this.canPopPathStack = function()
    {
        return this.pathStack.length > 0;
    };
    
    this.addToPathStack = function( coordinate )
    {
        this.pathStack.push( coordinate );
        this.pathLookup[coordinate.getKey()] = true;
    };
    
    this.isOnPath = function( coordinate )
    {
        return !!this.pathLookup[coordinate.getKey()];
    };
    
    this.addToLevel = function( coordinate )
    {
        this.level[ coordinate.getKey() ] = coordinate.copy();
        this.bounds.updateWithCoordinate( coordinate );
        //console.log( "Added " + coordinate.toString() + " to the level, the bounds are now " + this.bounds.toString() );
    };
    
    //we don't allow the start to be open from the left side
    this.hasBadStartOpenDirection = function()
    {
        let badCoordinate = this.startCoordinate.createSum( new Coordinate( -1, 0 ) );
    
        //if that coordinate exists, this is a bad exit
        return this.roomExists( badCoordinate );
    };
    
    //if the start has an opening in the wrong direction, this will flip the entire level
    this.ensureStartOpenDirection = function()
    {
        //with a bad start opening direction, we need to flip the level over the X axis
        if ( this.hasBadStartOpenDirection() )
        {          
            //flip the level over by making the proper axis negative
            let newLevel = {};
            for ( let key in this.level )
            {
                let oldCoordinate = this.level[ key ];
                let newCoordinate = new Coordinate( -oldCoordinate.x, oldCoordinate.y );
                newLevel[ newCoordinate.getKey() ] = newCoordinate;
            }
        
            this.startCoordinate = new Coordinate( -this.startCoordinate.x, this.startCoordinate.y );
            this.endCoordinate   = new Coordinate( -this.endCoordinate.x  , this.endCoordinate.y   );
        
            this.bounds = new ExpandableBounds( this.bounds.maxSize,
                                                new Coordinate( -this.bounds.max.x, this.bounds.min.y ),
                                                new Coordinate( -this.bounds.min.x, this.bounds.max.y ) );
            
            this.level = newLevel;
        }
    };
    
    this.toString = function()
    {
        let levelString = "";
        // let printBounds = this.bounds.copy();
        // printBounds.updateWithCoordinate( this.startCoordinate );
        // printBounds.updateWithCoordinate( this.endCoordinate );
        
        // console.log( "Start: (" + ( this.startCoordinate.x - this.bounds.min.x ) + "," + ( this.startCoordinate.y - this.bounds.min.y ) +
        //              ") End: (" + ( this.endCoordinate.x - this.bounds.min.x ) + "," + ( this.endCoordinate.y - this.bounds.min.y ) +
        //              ") Min: (" + ( this.bounds.min.x - this.bounds.min.x ) + "," + ( this.bounds.min.y  - this.bounds.min.y ) +
        //              ") Max: (" + ( this.bounds.max.x - this.bounds.min.x ) + "," + ( this.bounds.max.y - this.bounds.min.y ) +
        //              ") Size: (" + this.bounds.getSize().x + "," + this.bounds.getSize().y + ")" );
        // console.log( JSON.stringify( this.level ) );
        
        for ( let y = this.bounds.min.y; y <= this.bounds.max.y; y++ )
        {
            for ( let x = this.bounds.min.x; x <= this.bounds.max.x; x++ )
            {
                if ( x === this.startCoordinate.x && y === startCoordinate.y )
                {
                    levelString += "🚹";
                }
                else if ( x === this.endCoordinate.x && y === this.endCoordinate.y )
                {
                    levelString += "🆚";
                }
                else 
                {
                    levelString += this.roomExists( new Coordinate( x, y ) ) ? "🔲" : "⬛️";
                }
            }
            levelString += "\n";
        }
        return levelString;
    };
    
    //we always have the start coordinate in the level
    this.addToLevel( this.startCoordinate );
    
    //close the very first room from the left side, just a design constraint
    this.closeCoordinate( this.startCoordinate.createSum( new Coordinate( -1, 0 ) ) );
};

let LevelGenerator =
{
    findValidCoordinates:function( data, origin, ignoreBounds )
    {
        let validCoordinates = [];
        for ( let dirIndex = 0; dirIndex < DIRECTION_DELTAS.length; dirIndex++ )
        {
            let c = origin.createSum( DIRECTION_DELTAS[ dirIndex ] );
        
            if ( this.isValidCoordinate( data, c, ignoreBounds ) )
            {
                validCoordinates.push( c );
            }
        }
    
        return validCoordinates;
    },
    
    isValidCoordinate:function( data, c, ignoreBounds )
    {
        return ( ( ignoreBounds || data.bounds.canContainCoordinate( c ) ) &&
        !data.roomExists( c ) && !data.coordinateIsClosed( c ) && c.x >= data.startCoordinate.x );
    },

    getNewRoomCoordinate:function( data, origin, ignorePathStack, ignoreBounds, allowAdjacentNeigbors )
    {
        //find valid coordinates only considering bounds and room collisions
        let possibleNeighborCoordinates = this.findValidCoordinates( data, origin, ignoreBounds );
        let validCoordinates = [];
    
        //then, using these coordinates, search through neighbors of each option as well,
        //this avoids the rooms ever touching each other (forcing snakes)
        for ( let neighborCoordinateIndex = 0; neighborCoordinateIndex < possibleNeighborCoordinates.length; neighborCoordinateIndex++ )
        {
            let neighborCoordinate = possibleNeighborCoordinates[ neighborCoordinateIndex ];
    
            let validNeighborCount = 0;
            for ( let directionDeltaIndex = 0; directionDeltaIndex < DIRECTION_DELTAS.length; directionDeltaIndex++ )
            {
                let otherNeighborCoordinate = neighborCoordinate.createSum( DIRECTION_DELTAS[ directionDeltaIndex ] );
                if ( this.isValidCoordinate( data, otherNeighborCoordinate, ignoreBounds ) )
                {
                    validNeighborCount++;
                }
                //we might want to allow double connections to neighbors... but never allow double connections to the path
                else if ( allowAdjacentNeigbors && !data.isOnPath( otherNeighborCoordinate ) )
                {
                    validNeighborCount++;
                }
            }
            
            //if we have 3 neighbors that we can use, then we're in business and this is an actual valid option
            if ( validNeighborCount >= DIRECTION_DELTAS.length - 1 )
            {
                validCoordinates.push( neighborCoordinate );
            }
        }
    
        //if we have no coordinates, we need to backtrack and pop this room
        if ( validCoordinates.length <= 0 )
        {
            if ( ignorePathStack || !data.canPopPathStack() )
            {
                return null;
            }
        
            data.closeCoordinate( origin );
            return this.getNewRoomCoordinate( data, data.popPathStack(), ignorePathStack, allowAdjacentNeigbors );
        }
    
        //now choose a random valid coordinate, and add the room there
        let newCoordinate = validCoordinates[ Math.floor( Math.random() * validCoordinates.length ) ];
        if ( !ignorePathStack )
        {
            data.addToPathStack( newCoordinate );
        }
        return newCoordinate;
    },

    createOffshoots:function( data, offshootCount, allowAdjacentOffshoots )
    {
        //copy over the path stack into a valid coordinates list we can modify safely
        let validOffshootCoordinates = [];
        for ( let pathIndex = 0; pathIndex < data.pathStack.length; pathIndex++ )
        {
            let coordinate = data.pathStack[ pathIndex ];
            if ( ( coordinate.x !== data.startCoordinate.x || coordinate.y !== data.startCoordinate.y ) &&
                 ( coordinate.x !== data.endCoordinate.x   || coordinate.y !== data.endCoordinate.y   ) )
            {
                validOffshootCoordinates.push( coordinate );
            }
        }
    
        //create offshoots as long as we haven't made as many as want and there are possible locations left
        let createdOffshootCount = 0;
        while ( createdOffshootCount < offshootCount && validOffshootCoordinates.length > 0 )
        {
            let coordIndex = Math.floor( Math.random() * validOffshootCoordinates.length );
            let coordinate = validOffshootCoordinates[ coordIndex ];
            validOffshootCoordinates.splice( coordIndex, 1 );
            coordinate = this.getNewRoomCoordinate( data, coordinate, true, !BOUND_OFFSHOOTS, allowAdjacentOffshoots );

            if ( coordinate )
            {
                data.addToLevel( coordinate );
                validOffshootCoordinates.push( coordinate );
                createdOffshootCount++;
            }
        }
    
        // if ( createdOffshootCount < offshootCount )
        // {
        //     console.log( "Could not create " + offshootCount + " offshoots, only managed to create " + createdOffshootCount );
        // }
    },

    createLevel:function( width, height, pathLength, offshootCount, allowAdjacentOffshoots )
    {
        //constrain the path length so that it doesn't go too far for these dimensions
        pathLength = Math.min( pathLength, width + height - 2 );
    
        //create the LevelGenData
        let data = new LevelGenData( new Coordinate( 0, 0 ), new Coordinate( width, height ) );
    
        //begin with the startCoordinate
        let coordinate = data.startCoordinate;

        //we start at a length of 1 because we already have the starting room
        for ( let currentLength = 1; currentLength <= pathLength; currentLength++ )
        {
            let newCoordinate = this.getNewRoomCoordinate( data, coordinate );
        
            //in case for some reason we were unable to generate another path, break out (which will use whatever the last successful path was for the endCoordinate)
            if ( !newCoordinate )
            {
                console.log( "Failed to create full path!" );
                break;
            }
        
            //assign the new coordinate to be the current one tracked
            coordinate = newCoordinate;
        
            //place the new coordinate into the level
            data.addToLevel( coordinate );
        
            //Every part of the path except the boss room (the last room in the path) is a valid offshoot coordinate
            // if ( currentLength < pathLength )
            // {
            //     validOffshootCoordinates.push( coordinate );
            // }
        }
    
        //the last room on the path is the boss room
        if ( coordinate )
        {
            data.endCoordinate = coordinate;
            //level[ getKey( coordinate ) ] = coordinate; //unnecessary I think
        }
    
        //now we can make offshoot rooms
        this.createOffshoots( data, offshootCount, allowAdjacentOffshoots );
    
        //make sure the exit is open in the proper direction
        data.ensureStartOpenDirection();
    
        //finally, return the data
        return data;
    }
};