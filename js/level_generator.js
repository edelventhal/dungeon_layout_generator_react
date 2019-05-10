let BOUND_OFFSHOOTS = false;

let getXYKey = function( x, y )
{
    return x + "," + y;
};

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
        return getXYKey( this.x, this.y );
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
    };
    
    this.closeNeighbor = function( neighborCoordinate )
    {
        if ( !this.closed )
        {
            this.closed = {};
        }
        this.closed[neighborCoordinate.getKey()] = true;
    };
    
    this.openNeighbor = function( neighborCoordinate )
    {
        if ( !this.closed )
        {
            return;
        }
        this.closed[neighborCoordinate.getKey()] = false;
    };
    
    this.isNeighborClosed = function( neighborCoordinate )
    {
        if ( !this.closed )
        {
            return false;
        }
        return !!this.closed[neighborCoordinate.getKey()];
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
    this.extentsCoordinates = {};
    
    for ( let dirIndex = 0; dirIndex < DIRECTION_DELTAS.length; dirIndex++ )
    {
        let delta = DIRECTION_DELTAS[dirIndex];
        this.extentsCoordinates[delta.getKey()] = ( delta.x < 0 || delta.y < 0 ? minCoordinate : maxCoordinate ).copy();
    }
    
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
        
        
        //TODO - definitely a better way to do this
        if ( coordinate.x < this.extentsCoordinates["-1,0"].x )
        {
            this.extentsCoordinates["-1,0"] = coordinate.copy();
        }
        
        if ( coordinate.x > this.extentsCoordinates["1,0"].x )
        {
            this.extentsCoordinates["1,0"] = coordinate.copy();
        }
        
        if ( coordinate.y < this.extentsCoordinates["0,-1"].y )
        {
            this.extentsCoordinates["0,-1"] = coordinate.copy();
        }
        
        if ( coordinate.y > this.extentsCoordinates["0,1"].y )
        {
            this.extentsCoordinates["0,1"] = coordinate.copy();
        }
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
    this.boundsStack = [];
    this.open = [];
    
    this.roomExists = function( coordinate )
    {
        return !!this.level[ coordinate.getKey() ];
    };
    
    this.popPathStack = function()
    {
        if ( this.canPopPathStack() )
        {
            let coordinate = this.pathStack.pop();
            let key = coordinate.getKey();
            this.pathLookup[key] = false;
            delete( this.level[key] );
            this.bounds = this.boundsStack.pop();
            return coordinate;
        }
        return null;
    };
    
    this.peekPathStack = function()
    {
        if ( this.canPopPathStack() )
        {
            return this.pathStack[ this.pathStack.length - 1 ];
        }
        return null;
    }
    
    this.canPopPathStack = function()
    {
        return this.pathStack.length > 0;
    };
    
    this.addToPathStack = function( coordinate )
    {
        this.pathStack.push( coordinate );
        this.pathLookup[coordinate.getKey()] = true;
        this.boundsStack.push( this.bounds.copy() );
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
    
    //merges data from another LevelGenData into this one
    this.merge = function( otherData )
    {
        this.timesMerged = this.timesMerged || 0;
        
        //choose a random direction to add this other area to
        let directionIndex = Math.floor( Math.random() * DIRECTION_DELTAS.length ) % 2; //0 and 2 are top and right, this is hacky...
        let direction = DIRECTION_DELTAS[ directionIndex ];
        let oppositeDirecton = DIRECTION_DELTAS[ ( directionIndex + 2 ) % DIRECTION_DELTAS.length ];
        let originalExtents = this.bounds.extentsCoordinates[ direction.getKey() ];
        let oppositeExents = otherData.bounds.extentsCoordinates[ oppositeDirecton.getKey() ]
        let offset = new Coordinate( originalExtents.x + direction.x - oppositeExents.x, originalExtents.y + direction.y - oppositeExents.y );
        //let costOffset = this.level[originalExtents.getKey()].cost;
        
        for ( let y = otherData.bounds.min.y; y <= otherData.bounds.max.y; y++ )
        {
            for ( let x = otherData.bounds.min.x; x <= otherData.bounds.max.x; x++ )
            {
                let otherCoord = otherData.level[getXYKey(x,y)];
                if ( otherCoord )
                {
                    otherCoord.x += offset.x;
                    otherCoord.y += offset.y;
                    
                    if ( !this.roomExists( otherCoord ) )
                    {
                        otherCoord.cost = ( this.timesMerged + 1 );//costOffset;
                        this.addToLevel( otherCoord );
                    }
                }
            }
        }
        
        this.timesMerged++;
    };
    
    this.toString = function()
    {
        let levelString = "";
        
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
        clone.boundsStack = [];
        for ( let stackIndex = 0; stackIndex < this.pathStack.length; stackIndex++ )
        {
            clone.pathStack.push( this.pathStack[stackIndex].copy() );
            clone.boundsStack.push( this.boundsStack[stackIndex].copy() );
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
    this.addToPathStack( this.startCoordinate );
};

let LevelGenerator =
{
    findValidNeighborCoordinates:function( data, origin, ignoreBounds, allowAdjacentNeighbors )
    {
        let validCoordinates = [];
        
        //Go through every neighbor and add it to the list if it's both valid and can exist next to its neighbors
        for ( let dirIndex = 0; dirIndex < DIRECTION_DELTAS.length; dirIndex++ )
        {
            //add 1 to the cost for each of these, as they may be added to the level
            let c = origin.createSum( DIRECTION_DELTAS[ dirIndex ], 1 );
        
            if ( this.isValidCoordinate( data, c, origin, ignoreBounds ) &&
                 this.canCoordinateBeAdjacentToNeighbors( data, c, origin, ignoreBounds, allowAdjacentNeighbors ) )
            {
                validCoordinates.push( c );
            }
        }
    
        return validCoordinates;
    },
    
    canCoordinateBeAdjacentToNeighbors:function( data, c, origin, ignoreBounds, allowAdjacentNeighbors )
    {
        //go through each direction, check every neighbor.
        //they must either not exist, or we must allow adjacent neighbors and connecting must not shorten the path
        for ( let directionDeltaIndex = 0; directionDeltaIndex < DIRECTION_DELTAS.length; directionDeltaIndex++ )
        {
            let neighborCoordinate = c.createSum( DIRECTION_DELTAS[ directionDeltaIndex ] );
            
            //if any neighbors are unacceptable, then we cannot be placed here
            if ( !this.isAcceptableNeighbor( data, neighborCoordinate, origin, allowAdjacentNeighbors ) )
            {
                return false;
            }
        }
        
        return true;
    },
    
    //A coordinate is valid if:
    //We're either ignoring the bounds or it's within the bounds, and
    //There is no room at that location, and
    //That location has not been closed (already processed)
    isValidCoordinate:function( data, c, origin, ignoreBounds )
    {
        return ( ( ignoreBounds || data.bounds.canContainCoordinate( c ) ) &&
                  !data.roomExists( c ) && !origin.isNeighborClosed( c ) );
    },
    
    //A neighbor is acceptable if:
    //it's the origin coordinate (meaning where we're trying to branch off of), or
    //it's an unfilled location (AKA a valid coordinate)
    //or if we allow neighbors and the cost difference between those neighbors is only 1 (meaning it will not short-circuit any paths)
    isAcceptableNeighbor:function( data, c, origin, allowAdjacentNeighbors )
    {
        if ( c.equals( origin ) )
        {
            return true;
        }
        
        if ( this.isValidCoordinate( data, c, origin, true ) )
        {
            return true;
        }
        
        let room = data.level[ c.getKey() ];
        if ( allowAdjacentNeighbors && room && Math.abs( room.cost - c.cost ) <= 1 )
        {
            return true;
        }
        
        return false;
    },

    addNewCoordinate:function( data, origin, ignorePathStack, ignoreBounds, allowAdjacentNeighbors )
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
        
            //pop the stack. It's possible that this coordinate is already at the top of the stack – so peek at the next one
            let poppedCoordinate = data.popPathStack();
            if ( poppedCoordinate.equals( origin ) )
            {
                if ( !data.canPopPathStack() )
                {
                    return null;
                }
                poppedCoordinate = data.peekPathStack();
            }
            
            poppedCoordinate.closeNeighbor( origin ); //we don't want to be able to try this exact neighbor again
            return this.addNewCoordinate( data, poppedCoordinate, ignorePathStack, allowAdjacentNeighbors );
        }
    
        //now choose a random valid coordinate, and add the room there
        let newCoordinate = validCoordinates[ Math.floor( Math.random() * validCoordinates.length ) ];
        if ( !ignorePathStack )
        {
            data.addToPathStack( newCoordinate );
        }
        
        //place the new coordinate into the level
        data.addToLevel( newCoordinate );
        
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
            let newCoordinate = this.addNewCoordinate( data, coordinate, true, !BOUND_OFFSHOOTS, allowAdjacentOffshoots );

            if ( newCoordinate )
            {
                validOffshootCoordinates.push( newCoordinate );
                createdOffshootCount++;
            }
        }
    },

    createLevel:function( width, height, pathLength, offshootCount, areaCount, allowAdjacentOffshoots )
    {
        let fullData = null;
        
        for ( let areaIndex = 0; areaIndex < areaCount; areaIndex++ )
        {
            //create the LevelGenData
            let data = new LevelGenData( new Coordinate( 0, 0, 0 ), new Coordinate( width, height, pathLength ) );
    
            //begin with the startCoordinate
            let coordinate = data.startCoordinate;

            while ( data.pathStack.length <= pathLength )
            {
                let newCoordinate = this.addNewCoordinate( data, coordinate );
                    
                //in case for some reason we were unable to generate another path (a path that can't fit within the bounds),
                //break out (which will use whatever the last successful path was for the endCoordinate)
                if ( !newCoordinate )
                {
                    console.log( "Could not create a valid path with these parameters." );
                    return new LevelGenData( data.startCoordinate, data.bounds.maxSize );
                }
        
                //assign the new coordinate to be the current one tracked
                coordinate = newCoordinate;
            }
    
            //the last room on the path is the end
            data.endCoordinate = coordinate;
    
            //now we can make offshoot rooms
            this.createOffshoots( data, offshootCount, allowAdjacentOffshoots );
            
            console.log( data.toString() );
            console.log( "Extents are " + JSON.stringify( data.bounds.extentsCoordinates ) );
            console.log( "Start is " + data.startCoordinate );
    
            //combine this with existing data
            if ( fullData )
            {
                fullData.merge( data );
            }
            else
            {
                fullData = data;
            }
        }
        
        console.log( "------------FULL-----------" );
        console.log( fullData.toString() );
        console.log( "Extents are " + JSON.stringify( fullData.bounds.extentsCoordinates ) );
        console.log( "Start is " + fullData.startCoordinate );
    
        //finally, return the data
        return fullData;
    },
    
    continueCreatingLevel:function( data )
    {
        //TODO?
    }
};