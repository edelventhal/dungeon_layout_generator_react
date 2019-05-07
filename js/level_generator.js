let BOUND_OFFSHOOTS = false;

let Coordinate = function( xOrCoordinate, y, cost )
{
    if ( typeof( xOrCoordinate ) === "object" )
    {
        this.x = xOrCoordinate.x;
        this.y = xOrCoordinate.y;
        this.cost = xOrCoordinate.cost;
    }
    else 
    {
        this.x = xOrCoordinate;
        this.y = y;
        this.cost = cost || 0;
    }
    
    this.getKey = function()
    {
        return this.x + "," + this.y;
    };
    
    this.toString = function()
    {
        return "(" + this.x + "," + this.y + ") - " + this.cost;
    };
    
    this.copy = function()
    {
        return new Coordinate( this );
    };
    
    this.createSum = function( otherCoordinate, costDelta )
    {
        return new Coordinate( this.x + otherCoordinate.x, this.y + otherCoordinate.y, this.cost + ( costDelta || 0 ) );
    };
    
    this.equals = function( otherCoordinate )
    {
        return this.x === otherCoordinate.x && this.y === otherCoordinate.y;
    }
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
        let key = coordinate.getKey();
        this.level[ key ] = coordinate.copy();
        this.bounds.updateWithCoordinate( coordinate );
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
                let newCoordinate = new Coordinate( -oldCoordinate.x, oldCoordinate.y, oldCoordinate.cost );
                newLevel[ newCoordinate.getKey() ] = newCoordinate;
            }
        
            this.startCoordinate = new Coordinate( -this.startCoordinate.x, this.startCoordinate.y, this.startCoordinate.cost );
            this.endCoordinate   = new Coordinate( -this.endCoordinate.x  , this.endCoordinate.y, this.endCoordinate.cost );
        
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
    
    this.copy = function()
    {
        let clone = new LevelGenData( this.startCoordinate, this.bounds.maxSize );
        clone.endCoordinate = this.endCoordinate.copy();
        clone.bounds = this.bounds.copy();
        
        clone.level = {};
        for ( let key in this.level )
        {
            clone.level[key] = this.level[key].copy();
        }
        
        clone.pathStack = [];
        for ( let stackIndex = 0; stackIndex < this.pathStack.length; stackIndex++ )
        {
            clone.pathStack.push( this.pathStack[stackIndex].copy() );
        }
        
        clone.pathLookup = {};
        for ( let key in this.pathLookup )
        {
            clone.pathLookup[key] = this.pathLookup[key];
        }
        
        clone.open = [];
        for ( let openIndex = 0; openIndex < this.open.length; openIndex++ )
        {
            clone.open.push( this.open[openIndex].copy() );
        }
        
        clone.closed = {};
        for ( let key in this.closed )
        {
            clone.closed[key] = this.closed[key];
        }
        
        return clone;
    }
    
    //we always have the start coordinate in the level
    this.addToLevel( this.startCoordinate );
    
    //close the very first room from the left side, just a design constraint
    this.closeCoordinate( this.startCoordinate.createSum( new Coordinate( -1, 0 ) ) );
};

let LevelGenerator =
{
    findValidNeighborCoordinates:function( data, origin, ignoreBounds, allowAdjacentNeighbors )
    {
        let validCoordinates = [];
        
        //first, add every valid niegbor coordinate 
        let possibleNeighborCoordinates = [];
        for ( let dirIndex = 0; dirIndex < DIRECTION_DELTAS.length; dirIndex++ )
        {
            //add 1 to the cost for each of these, as they may be added to the level
            let c = origin.createSum( DIRECTION_DELTAS[ dirIndex ], 1 );
        
            if ( this.isValidCoordinate( data, c, ignoreBounds ) )
            {
                possibleNeighborCoordinates.push( c );
            }
        }
        
        //loop through those and check each of their neighbors - this is for avoiding snaking or shortening the path
        for ( let neighborCoordinateIndex = 0; neighborCoordinateIndex < possibleNeighborCoordinates.length; neighborCoordinateIndex++ )
        {
            let c = possibleNeighborCoordinates[ neighborCoordinateIndex ];
            if ( this.canCoordinateBeAdjacentToNeighbors( data, c, origin, ignoreBounds, allowAdjacentNeighbors ) )
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
    
    canCoordinateBeAdjacentToNeighbors:function( data, c, origin, ignoreBounds, allowAdjacentNeighbors )
    {
        //go through each direction, check every neighbor.
        //they must either not exist, or we must allow adjacent neighbors and connecting must not shorten the path
        for ( let directionDeltaIndex = 0; directionDeltaIndex < DIRECTION_DELTAS.length; directionDeltaIndex++ )
        {
            let neighborCoordinate = c.createSum( DIRECTION_DELTAS[ directionDeltaIndex ] );
            
            //don't bother if the neighbor is the origin coordinate – we know that's already been placed
            if ( !neighborCoordinate.equals( origin ) )
            {
                //we only care about invalid (non-empty) coordinates
                if ( !this.isValidCoordinate( data, neighborCoordinate, true ) )
                {
                    if ( allowAdjacentNeighbors )
                    {
                        let neighborKey = neighborCoordinate.getKey();
                
                        if ( data.level[ neighborKey ] )
                        {
                            let otherCost = data.level[ neighborKey ].cost;
                    
                            if ( Math.abs( otherCost - c.cost ) > 1 )
                            {
                                return false;
                            }
                        }
                    }
                    else
                    {
                        return false;
                    }
                }
            }
        }
        
        return true;
    },

    getNewCoordinate:function( data, origin, ignorePathStack, ignoreBounds, allowAdjacentNeighbors )
    {
        //find valid coordinates only considering bounds and room collisions
        let validCoordinates = this.findValidNeighborCoordinates( data, origin, ignoreBounds, allowAdjacentNeighbors );
    
        //if we have no coordinates, we need to backtrack and pop this room
        if ( validCoordinates.length <= 0 )
        {
            if ( ignorePathStack || !data.canPopPathStack() )
            {
                return null;
            }
        
            data.closeCoordinate( origin );
            return this.getNewCoordinate( data, data.popPathStack(), ignorePathStack, allowAdjacentNeighbors );
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
        //copy over all existing coordinates into a valid coordinates list we can modify safely
        let validOffshootCoordinates = [];
        for ( let key in data.level )
        {
            let coordinate = data.level[ key ];
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
            //get a random coordinate from the possible locations
            let coordinate = validOffshootCoordinates.splice( Math.floor( Math.random() * validOffshootCoordinates.length ), 1 )[0];
            
            //try creating a new neighbor room from that location, if possible
            let newCoordinate = this.getNewCoordinate( data, coordinate, true, !BOUND_OFFSHOOTS, allowAdjacentOffshoots );

            if ( newCoordinate )
            {
                data.addToLevel( newCoordinate );
                validOffshootCoordinates.push( newCoordinate );
                createdOffshootCount++;
            }
        }
    },

    createLevel:function( width, height, pathLength, offshootCount, allowAdjacentOffshoots )
    {
        //constrain the path length so that it doesn't go too far for these dimensions
        pathLength = Math.min( pathLength, width + height - 2 );
    
        //create the LevelGenData
        let data = new LevelGenData( new Coordinate( 0, 0, 0 ), new Coordinate( width, height, pathLength ) );
    
        //begin with the startCoordinate
        let coordinate = data.startCoordinate;

        //we start at a length of 1 because we already have the starting room
        for ( let currentLength = 1; currentLength <= pathLength; currentLength++ )
        {
            let newCoordinate = this.getNewCoordinate( data, coordinate );
        
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